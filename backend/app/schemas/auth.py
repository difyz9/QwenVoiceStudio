from pydantic import BaseModel

from backend.app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    username: str
    password: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "username": "admin",
                "password": "admin123",
            }
        }
    }


class LoginResponse(BaseModel):
    access_token: str
    user: UserResponse

    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "<jwt-token>",
                "user": {
                    "id": 1,
                    "username": "admin",
                    "role": "admin",
                    "status": "active",
                    "created_at": "2026-04-05T02:53:33.078275Z",
                },
            }
        }
    }