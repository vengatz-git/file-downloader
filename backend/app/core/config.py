from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    PROJECT_NAME: str = "Telegram File Downloader Backend"
    VERSION: str = "1.0.0"

    # Telegram Credentials
    TELEGRAM_API_ID: int = Field(default=0, description="Telegram API ID from my.telegram.org")
    TELEGRAM_API_HASH: str = Field(default="", description="Telegram API Hash from my.telegram.org")
    TELEGRAM_BOT_TOKEN: str = Field(default="", description="Bot Token from @BotFather (optional if session string provided)")
    TELEGRAM_SESSION_STRING: str = Field(default="", description="Telethon StringSession for user account access")

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    BASE_URL: str = "http://localhost:8000"
    ALLOWED_ORIGINS: Union[str, List[str]] = "*"

    # Chunk buffer size for MTProto stream reading (typically 512KB to 1MB)
    DOWNLOAD_CHUNK_SIZE: int = 512 * 1024  # 512 KB

    @field_validator("ALLOWED_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            if v == "*":
                return ["*"]
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
