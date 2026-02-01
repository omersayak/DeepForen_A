from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NetGraph Sentinel"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5433/netgraph_sentinel"
    REDIS_URL: str = "redis://localhost:6380/0"
    SECRET_KEY: str = "super_secret_key_change_me"
    
    # AI Config
    OPENAI_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None  # Added Gemini Support

    class Config:
        env_file = ".env"

settings = Settings()
