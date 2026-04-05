from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DesignedPresetCreateRequest(BaseModel):
    preset_code: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    language: str = Field(default="Chinese", min_length=1, max_length=32)
    ref_text: str = Field(min_length=1, max_length=500)
    instruct: str = Field(min_length=1, max_length=800)


class VoicePresetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    preset_code: str
    name: str
    language: str
    instruct: str
    ref_text: str
    reference_audio_path: str | None
    reference_audio_status: str
    reference_audio_error: str | None
    source_type: str
    created_at: datetime