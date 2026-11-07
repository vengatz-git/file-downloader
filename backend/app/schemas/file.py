from typing import Optional
from pydantic import BaseModel, HttpUrl, Field


class ResolveRequest(BaseModel):
    link: str = Field(..., description="Telegram message or post link, e.g. https://t.me/c/123456789/42 or https://t.me/channel/42")


class FileMetadataResponse(BaseModel):
    chat_id: int = Field(..., description="Resolved Telegram chat/channel numeric ID")
    message_id: int = Field(..., description="Message ID containing the media")
    file_name: str = Field(..., description="Extracted or default filename")
    file_size: int = Field(..., description="Total file size in bytes")
    mime_type: str = Field(..., description="MIME content type")
    download_url: str = Field(..., description="Direct HTTP streaming URL on this VPS")
    caption: Optional[str] = Field(default=None, description="Optional caption text from the message")


class HealthResponse(BaseModel):
    status: str
    telegram_connected: bool
    version: str
