from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SynthesisJobCreateRequest(BaseModel):
    preset_code: str = Field(min_length=1, max_length=64)
    texts: list[str] = Field(min_length=1, max_length=50)
    language: str | None = Field(default=None, max_length=32)
    merge_output: bool = True
    pause_ms: int = Field(default=300, ge=0, le=5000)

    model_config = {
        "json_schema_extra": {
            "example": {
                "preset_code": "brand_female_01",
                "texts": [
                    "欢迎使用 Qwen Voice Studio。",
                    "这是一条来自预置音色的批量合成演示。",
                ],
                "language": "Chinese",
                "merge_output": True,
                "pause_ms": 300,
            }
        }
    }


class SynthesisJobResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "job_code": "syn_0bbb6e385752",
                "preset_code": "brand_female_01",
                "job_type": "batch",
                "status": "completed",
                "input_payload": {
                    "texts": ["欢迎使用 Qwen Voice Studio。", "这是一条来自预置音色的批量合成演示。"],
                    "language": "Chinese",
                    "merge_output": True,
                    "pause_ms": 300,
                    "output_dir": "/app/outputs/synthesis_jobs/syn_0bbb6e385752",
                    "output_files": [
                        "/app/outputs/synthesis_jobs/syn_0bbb6e385752/line_01.wav",
                        "/app/outputs/synthesis_jobs/syn_0bbb6e385752/line_02.wav",
                    ],
                    "sample_rate": 24000,
                },
                "merged_audio_path": "/app/outputs/synthesis_jobs/syn_0bbb6e385752/final.wav",
                "error_message": None,
                "created_at": "2026-04-05T05:55:45.198257Z",
            }
        },
    )

    id: int
    job_code: str
    preset_code: str
    job_type: str
    status: str
    input_payload: dict
    merged_audio_path: str | None
    error_message: str | None
    created_at: datetime
