from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "ok",
                "service": "Qwen Voice Studio",
            }
        }
    }


class SummaryResponse(BaseModel):
    appName: str
    currentUser: str
    presetCount: int
    runtime: str
    defaultAdmin: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "appName": "Qwen Voice Studio",
                "currentUser": "admin",
                "presetCount": 3,
                "runtime": "production",
                "defaultAdmin": "admin",
            }
        }
    }