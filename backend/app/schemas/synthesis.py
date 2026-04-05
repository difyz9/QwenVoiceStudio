from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SynthesisJobCreateRequest(BaseModel):
    preset_code: str = Field(min_length=1, max_length=64)
    texts: list[str] = Field(min_length=1, max_length=50)
    language: str | None = Field(default=None, max_length=32)
    merge_output: bool = True
    pause_ms: int = Field(default=300, ge=0, le=5000)


class SynthesisJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_code: str
    preset_code: str
    job_type: str
    status: str
    input_payload: dict
    merged_audio_path: str | None
    error_message: str | None
    created_at: datetime
