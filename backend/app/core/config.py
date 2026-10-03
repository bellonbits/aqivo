from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "postgresql+psycopg://mac@localhost:5432/bizora"
    secret_key: str = "dev-only-secret-change-me-dev-only-secret"
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    base_domain: str = "aqivo.shop"
    public_base_url: str = "http://localhost:8000"
    app_base_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173"
    custom_domain_cname: str = "domains.aqivo.shop"  # where customers point www.theirshop.com
    custom_domain_ips: str = ""  # comma-separated A-record targets for apex domains (set in production)
    redis_url: str = ""  # set to share rate limits across workers, e.g. redis://localhost:6379/0
    media_dir: str = "storage"
    max_upload_bytes: int = 8 * 1024 * 1024

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "Aqivo <hello@aqivo.shop>"

    mpesa_consumer_key: str = ""
    mpesa_consumer_secret: str = ""
    mpesa_shortcode: str = ""
    mpesa_passkey: str = ""
    mpesa_callback_secret: str = ""
    mpesa_env: str = "sandbox"

    anthropic_api_key: str = ""

    trial_days: int = 14
    grace_period_days: int = 7
    data_retention_days: int = 90
    login_max_attempts: int = 5
    login_lock_minutes: int = 15

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production and s.secret_key.startswith("dev-only"):
        raise RuntimeError("SECRET_KEY must be set in production")
    return s
