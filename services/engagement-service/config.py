"""Configuration for Engagement Service"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    ENVIRONMENT: str = "development"
    PORT: int = 8001
    
    # Database
    DATABASE_URL: str = "postgresql://talktoearn:dev_password@postgres:5432/talktoearn_db"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379"
    
    # Kafka
    KAFKA_BROKERS: str = "kafka:9092"
    KAFKA_GROUP_ID: str = "engagement-service"
    
    # Engagement Engine Settings
    DUPLICATE_THRESHOLD: float = 0.85
    SEMANTIC_THRESHOLD: float = 0.90
    RECENT_MESSAGE_WINDOW: int = 10
    
    # Points Configuration
    POINTS_EXCELLENT: int = 3
    POINTS_GOOD: int = 2
    POINTS_BASIC: int = 1
    
    # Feature Flags
    ENABLE_SEMANTIC_DETECTION: bool = False  # Disabled by default (requires model download)
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
