# app/config.py
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Database settings
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:patpimol00823@localhost:5432/defensive_db"
    )
    
    # Elasticsearch settings
    elasticsearch_url: str = os.getenv(
        "ELASTICSEARCH_URL",
        "http://localhost:9200"
    )
    
    # Scheduler settings
    rtarf_sync_interval_seconds: int = int(os.getenv(
        "RTARF_SYNC_INTERVAL_SECONDS",
        "300"  # Default: 5 minutes
    ))
    
    rtarf_sync_enabled: bool = os.getenv(
        "RTARF_SYNC_ENABLED",
        "true"
    ).lower() == "true"
    
    # API settings
    api_title: str = "Interactive Map & RTARF API"
    api_description: str = "API สำหรับจัดการข้อมูลโหนดบนแผนที่และ RTARF Events"
    api_version: str = "1.0.0"
    
    # CORS settings
    cors_origins: list = [
        "http://localhost:5173",
        "http://localhost:3000"
    ]
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create global settings instance
settings = Settings()