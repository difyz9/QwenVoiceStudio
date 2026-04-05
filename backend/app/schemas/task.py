from datetime import datetime

from pydantic import BaseModel


class TaskSummaryResponse(BaseModel):
    task_code: str
    task_type: str
    title: str
    detail: str
    status: str
    error_message: str | None = None
    created_at: datetime
    output_path: str | None = None
    action_path: str | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "task_code": "preset:brand_female_01",
                "task_type": "preset_reference_audio",
                "title": "参考音频生成",
                "detail": "品牌女声-清晰亲和 (brand_female_01)",
                "status": "ready",
                "error_message": None,
                "created_at": "2026-04-05T02:53:33.088811Z",
                "output_path": "/app/assets/voice_presets/brand_female_01/ref.wav",
                "action_path": "/presets?preset=brand_female_01",
            }
        }
    }


class TaskDetailResponse(TaskSummaryResponse):
    source_code: str
    source_name: str
    input_payload: dict | None = None
    instruct: str | None = None
    reference_text: str | None = None