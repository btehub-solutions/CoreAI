from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache
from typing import List
import json

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False
    )

    app_name: str = "CoreAI"
    environment: str = "development"
    debug: bool = False
    secret_key: str = "dev-secret-key"
    allowed_origins: List[str] = ["http://localhost:3000"]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            if not v.startswith("["):
                return [i.strip() for i in v.split(",")]
            import json
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
    ai_model: str = "gemini-1.5-flash"

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

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()

