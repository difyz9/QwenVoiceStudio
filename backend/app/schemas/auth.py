from pydantic import BaseModel

from backend.app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    user: UserResponse