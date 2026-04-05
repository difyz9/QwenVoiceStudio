from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = Field(default="development", alias="APP_ENV")
    app_name: str = Field(default="Qwen Voice Studio", alias="APP_NAME")
    database_url: str = Field(alias="DATABASE_URL")
    jwt_secret: str = Field(default="change-me", alias="JWT_SECRET")
    jwt_expire_minutes: int = Field(default=720, alias="JWT_EXPIRE_MINUTES")
    admin_username: str = Field(default="admin", alias="ADMIN_USERNAME")
    admin_password: str = Field(default="admin123", alias="ADMIN_PASSWORD")
    backend_internal_url: str = Field(default="http://127.0.0.1:8000", alias="BACKEND_INTERNAL_URL")
    preset_seed_file: Path = Field(default=Path("configs/voice_presets.array.example.json"), alias="PRESET_SEED_FILE")
    preset_library_dir: Path = Field(default=Path("assets/voice_presets"), alias="PRESET_LIBRARY_DIR")
    synthesis_output_dir: Path = Field(default=Path("outputs/synthesis_jobs"), alias="SYNTHESIS_OUTPUT_DIR")
    qwen_tts_model: str = Field(default="Qwen/Qwen3-TTS-12Hz-1.7B-Base", alias="QWEN_TTS_MODEL")
    qwen_tts_voice_design_model: str = Field(
        default="Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        alias="QWEN_TTS_VOICE_DESIGN_MODEL",
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()