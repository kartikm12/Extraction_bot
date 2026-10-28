import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
REPORTS_DIR = STORAGE_DIR / "reports"
LOGS_DIR = STORAGE_DIR / "logs"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    APP_NAME: str = "Tender Analysis and Extraction Bot"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = f"sqlite:///{STORAGE_DIR / 'tender_bot.db'}"
    
    # Storage
    STORAGE_PATH: Path = STORAGE_DIR
    UPLOAD_PATH: Path = UPLOADS_DIR
    REPORT_PATH: Path = REPORTS_DIR
    LOG_PATH: Path = LOGS_DIR
    
    # File Limits
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: list[str] = [".pdf", ".docx", ".doc"]
    MAX_PAGE_COUNT: int = 500
    
    # AI Engine Configuration
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "hybrid")  # hybrid, gemini, openai, rule_based
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-2.5-flash")
    LLM_TIMEOUT_SECONDS: int = 60
    MAX_RETRIES: int = 3
    
    # Security
    API_KEY_SECRET: str = os.getenv("API_KEY_SECRET", "tender-bot-dev-secret-change-in-prod")
    ENABLE_AUTH: bool = False  # Can be enabled for production deployments
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD_HASH: str = os.getenv("ADMIN_PASSWORD_HASH", "admin123")
    
    # OCR Settings
    ENABLE_OCR: bool = True
    MIN_TEXT_CHARS_PER_PAGE: int = 50
    OCR_DPI: int = 300

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

