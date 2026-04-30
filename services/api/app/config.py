from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List, Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        # Also read from actual environment variables (Vercel injects these)
        env_ignore_empty=True,
    )

    # Application
    app_name: str = "CoreAI"
    environment: str = "development"
    debug: bool = False

    # Security — REQUIRED: must be set in Vercel dashboard
    secret_key: str

    # CORS
    allowed_origins: List[str] = ["http://localhost:3000"]

    # Database — REQUIRED
    database_url: str

    # Redis — OPTIONAL (cache degrades gracefully without it)
    redis_url: Optional[str] = None

    # Token expiry
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # AI
    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    ai_model: str = "gemini-2.0-flash"

    # Email (all optional)
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = "noreply@coreai.com"
    mail_from_name: str = "CoreAI"
    mail_server: str = "smtp.gmail.com"
    mail_port: int = 587
    mail_starttls: bool = True
    mail_ssl_tls: bool = False

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
