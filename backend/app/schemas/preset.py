from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DesignedPresetCreateRequest(BaseModel):
    preset_code: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    language: str = Field(default="Chinese", min_length=1, max_length=32)
    ref_text: str = Field(min_length=1, max_length=500)
    instruct: str = Field(min_length=1, max_length=800)

    model_config = {
        "json_schema_extra": {
            "example": {
                "preset_code": "brand_female_web_01",
                "name": "品牌女声-Web 版",
                "language": "Chinese",
                "ref_text": "你好，欢迎使用我们的智能语音服务，接下来我会为你介绍主要功能。",
                "instruct": "年轻女性，声音清晰自然，亲和专业，语速适中，适合产品引导和品牌播报。",
            }
        }
    }


class VoicePresetResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "preset_code": "brand_female_01",
                "name": "品牌女声-清晰亲和",
                "language": "Chinese",
                "instruct": "年轻女性，声音清晰自然，亲和专业，语速适中，适合产品引导和品牌播报。",
                "ref_text": "你好，欢迎使用我们的智能语音服务，接下来我会为你介绍主要功能。",
                "reference_audio_path": "/app/assets/voice_presets/brand_female_01/ref.wav",
                "reference_audio_status": "ready",
                "reference_audio_error": None,
                "source_type": "builtin",
                "created_at": "2026-04-05T02:53:33.088811Z",
            }
        },
    )

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