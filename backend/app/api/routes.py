import re
from urllib.parse import quote
from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.telegram import telegram_manager
from app.schemas.file import ResolveRequest, FileMetadataResponse, HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Returns the backend health and Telegram MTProto connection state."""
    return HealthResponse(
        status="healthy",
        telegram_connected=telegram_manager.is_connected,
        version=settings.VERSION,
    )


@router.post("/api/resolve", response_model=FileMetadataResponse, tags=["Downloader"])
async def resolve_media_link(request: ResolveRequest):
    """
    Parses a Telegram link (public or private), queries Telegram MTProto,
    and returns file metadata including size, mime type, and streaming URL.
    """
    try:
        chat_identifier, message_id = telegram_manager.parse_telegram_link(request.link)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    try:
        message, file_name, file_size, mime_type = await telegram_manager.get_message_and_media(
            chat_identifier, message_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to resolve Telegram media: {str(e)}",
        )

    # Use the resolved numeric chat_id if available from message.chat_id
    resolved_chat_id = getattr(message, "chat_id", None) or chat_identifier

    download_url = f"{settings.BASE_URL.rstrip('/')}/api/stream/{resolved_chat_id}/{message_id}"

    return FileMetadataResponse(
        chat_id=int(resolved_chat_id) if str(resolved_chat_id).lstrip("-").isdigit() else 0,
        message_id=message_id,
        file_name=file_name,
        file_size=file_size,
        mime_type=mime_type,
        download_url=download_url,
        caption=message.text or None,
    )


@router.get("/api/stream/{chat_id}/{message_id}", tags=["Downloader"])
async def stream_telegram_file(chat_id: str, message_id: int, request: Request):
    """
    Streams file bytes directly from Telegram MTProto with full HTTP Range (RFC 7233) support.
    Enables resume, chunked download, and multi-threaded downloaders.
    """
    try:
        message, file_name, total_size, mime_type = await telegram_manager.get_message_and_media(
            chat_id, message_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Media not found or unresolvable: {str(e)}",
        )

    encoded_filename = quote(file_name)
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Disposition": f'attachment; filename="{file_name}"; filename*=UTF-8\'\'{encoded_filename}',
    }

    range_header = request.headers.get("Range")

    if range_header:
        # Expected format: "bytes=start-end" or "bytes=start-"
        range_match = re.match(r"bytes=(\d+)-(\d*)", range_header.strip())
        if not range_match:
            return Response(
                status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                headers={"Content-Range": f"bytes */{total_size}"},
            )

        start = int(range_match.group(1))
        end_str = range_match.group(2)
        end = int(end_str) if end_str else total_size - 1

        if start >= total_size or (end_str and end >= total_size) or start > end:
            return Response(
                status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                headers={"Content-Range": f"bytes */{total_size}"},
            )

        content_length = (end - start) + 1
        headers["Content-Range"] = f"bytes {start}-{end}/{total_size}"
        headers["Content-Length"] = str(content_length)
        headers["Content-Type"] = mime_type

        generator = telegram_manager.stream_file_bytes(
            message=message,
            offset=start,
            length=content_length,
        )

        return StreamingResponse(
            generator,
            status_code=status.HTTP_206_PARTIAL_CONTENT,
            headers=headers,
            media_type=mime_type,
        )

    # Full file response if no Range requested
    headers["Content-Length"] = str(total_size)
    headers["Content-Type"] = mime_type

    generator = telegram_manager.stream_file_bytes(
        message=message,
        offset=0,
        length=total_size,
    )

    return StreamingResponse(
        generator,
        status_code=status.HTTP_200_OK,
        headers=headers,
        media_type=mime_type,
    )
