import re
import logging
from typing import Optional, Tuple, AsyncGenerator
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.types import (
    MessageMediaDocument,
    MessageMediaPhoto,
    DocumentAttributeFilename,
)
from app.core.config import settings

logger = logging.getLogger("telegram_client")


class TelegramManager:
    def __init__(self):
        self.client: Optional[TelegramClient] = None
        self._is_connected = False

    async def start(self):
        """Initializes and authenticates the Telethon Telegram client."""
        if not settings.TELEGRAM_API_ID or not settings.TELEGRAM_API_HASH:
            logger.warning("Telegram API_ID or API_HASH not provided. Client will not start.")
            return

        session = StringSession(settings.TELEGRAM_SESSION_STRING or "")
        self.client = TelegramClient(session, settings.TELEGRAM_API_ID, settings.TELEGRAM_API_HASH)

        if settings.TELEGRAM_BOT_TOKEN and not settings.TELEGRAM_SESSION_STRING:
            logger.info("Connecting Telegram client via Bot Token...")
            await self.client.start(bot_token=settings.TELEGRAM_BOT_TOKEN)
        else:
            logger.info("Connecting Telegram client via User Session...")
            await self.client.start()

        self._is_connected = await self.client.is_user_authorized()
        logger.info(f"Telegram client connected. Authorized: {self._is_connected}")

    async def stop(self):
        """Gracefully disconnects the Telethon client."""
        if self.client:
            await self.client.disconnect()
            self._is_connected = False
            logger.info("Telegram client disconnected.")

    @property
    def is_connected(self) -> bool:
        return self._is_connected and self.client is not None and self.client.is_connected()

    @staticmethod
    def parse_telegram_link(link: str) -> Tuple[str, int]:
        """
        Parses Telegram links into (channel_or_chat_identifier, message_id).
        Supports:
          - https://t.me/c/1234567890/456 (private supergroup) -> (-1001234567890, 456)
          - https://t.me/channel_name/456 (public channel/group) -> ('channel_name', 456)
          - t.me/channel_name/456
        """
        link = link.strip()
        # Case 1: Private channel/group with /c/
        private_match = re.search(r"t\.me/c/(\d+)/(\d+)", link)
        if private_match:
            channel_id = int(f"-100{private_match.group(1)}")
            msg_id = int(private_match.group(2))
            return str(channel_id), msg_id

        # Case 2: Public channel/group/user
        public_match = re.search(r"t\.me/([^/]+)/(\d+)", link)
        if public_match:
            channel_name = public_match.group(1)
            msg_id = int(public_match.group(2))
            return channel_name, msg_id

        raise ValueError(f"Unsupported Telegram link format: {link}")

    async def get_message_and_media(self, entity_id: str | int, message_id: int):
        """Fetches the message and extracts media details."""
        if not self.is_connected:
            raise RuntimeError("Telegram client is not connected or unauthorized.")

        try:
            # Cast numeric entity if possible
            entity: str | int = int(entity_id) if str(entity_id).lstrip("-").isdigit() else entity_id
            target = await self.client.get_entity(entity)
            message = await self.client.get_messages(target, ids=message_id)

            if not message or not message.media:
                raise ValueError("Message not found or does not contain any downloadable media.")

            file_name = "downloaded_file.bin"
            file_size = 0
            mime_type = "application/octet-stream"

            if isinstance(message.media, MessageMediaDocument) and message.media.document:
                doc = message.media.document
                file_size = doc.size
                mime_type = doc.mime_type or "application/octet-stream"

                # Extract filename from document attributes
                for attr in doc.attributes:
                    if isinstance(attr, DocumentAttributeFilename):
                        file_name = attr.file_name
                        break
            elif isinstance(message.media, MessageMediaPhoto):
                file_name = f"photo_{message_id}.jpg"
                file_size = message.file.size if message.file else 0
                mime_type = "image/jpeg"
            else:
                if message.file:
                    file_name = message.file.name or f"media_{message_id}.bin"
                    file_size = message.file.size or 0
                    mime_type = message.file.mime_type or "application/octet-stream"

            return message, file_name, file_size, mime_type
        except Exception as e:
            logger.error(f"Error fetching message: {e}")
            raise

    async def stream_file_bytes(
        self,
        message,
        offset: int = 0,
        length: Optional[int] = None,
        chunk_size: Optional[int] = None,
    ) -> AsyncGenerator[bytes, None]:
        """
        Streams binary chunks directly from Telegram MTProto network.
        Supports offset and limit for HTTP 206 Partial Content (Range).
        """
        chunk_sz = chunk_size or settings.DOWNLOAD_CHUNK_SIZE
        try:
            async for chunk in self.client.iter_download(
                message.media,
                offset=offset,
                limit=length,
                request_size=chunk_sz,
            ):
                if chunk:
                    yield chunk
        except Exception as e:
            logger.error(f"Streaming error at offset={offset}: {e}")
            raise


telegram_manager = TelegramManager()
