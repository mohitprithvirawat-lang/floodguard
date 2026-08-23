import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FloodGuard — AI Flash Flood Early Warning System"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./floodguard.db")
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "*"
    ]
    SIMULATION_INTERVAL_SECONDS: int = 5

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
