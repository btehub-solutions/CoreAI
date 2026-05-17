from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, model_validator
from functools import lru_cache
from typing import List
import json
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False
    )

    app_name: str = "CoreAI"
    environment: str = "development"
    debug: bool = False
    secret_key: str = "dev-secret-key"
    allowed_origins: List[str] | str = ["http://localhost:3000"]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            if not v or v.strip() == "":
                return []
            if not v.startswith("["):
                return [i.strip() for i in v.split(",") if i.strip()]
            try:
                return json.loads(v)
            except Exception:
                return [v]
        return v

    database_url: str = ""
    redis_url: str = ""

    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    gemini_api_key: str = ""
    ai_model: str = "gemini-2.5-flash"
    ai_rate_limit_per_hour: int = 30
    ai_max_message_chars: int = 1200

    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = "noreply@coreai.app"
    mail_from_name: str = "CoreAI"
    mail_server: str = "smtp.gmail.com"
    mail_port: int = 587
    mail_starttls: bool = True
    mail_ssl_tls: bool = False

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.is_production:
            if self.secret_key in {"", "dev-secret-key", "change-me-generate-a-real-secret-key"}:
                raise ValueError("SECRET_KEY must be set to a strong unique value in production")
            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")
            if not self.database_url and not any(
                os.getenv(key)
                for key in ("POSTGRES_URL_NON_POOLING", "POSTGRES_URL", "POSTGRES_PRISMA_URL")
            ):
                raise ValueError("DATABASE_URL or a supported POSTGRES_URL must be set in production")
        return self

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
