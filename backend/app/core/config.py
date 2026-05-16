from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ClarityBooks"
    APP_VERSION: str = "1.1.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./smb_finance.db"

    # JWT
    SECRET_KEY: str = "super-secret-change-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    CORS_ALLOW_ALL: bool = True

    # Rate limiting
    RATE_LIMIT_AUTH: str = "10/minute"
    RATE_LIMIT_UPLOAD: str = "20/minute"

    # File upload
    MAX_CSV_ROWS: int = 50_000
    MAX_CSV_SIZE_MB: int = 10

    # Indian fiscal year
    FISCAL_YEAR_START_MONTH: int = 4

    # ── Phase 3 ──────────────────────────────────────────────────────────────
    # Anthropic (LLM insights)
    ANTHROPIC_API_KEY: Optional[str] = None

    # Email (SMTP) — for monthly reports
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@claritybooks.in"

    # Phase 4: Stripe billing
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_PRICE_STARTER: Optional[str] = None   # e.g. price_xxx
    STRIPE_PRICE_PRO: Optional[str] = None
    STRIPE_PRICE_BUSINESS: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
