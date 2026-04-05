from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.config import get_settings
from backend.app.core.security import create_access_token, verify_password
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import LoginRequest, LoginResponse
from backend.app.schemas.common import ApiResponse, success_response
from backend.app.schemas.user import UserResponse

router = APIRouter()
settings = get_settings()


@router.post("/login", response_model=ApiResponse[LoginResponse])
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> ApiResponse[LoginResponse]:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(subject=user.username)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.jwt_expire_minutes * 60,
        samesite="lax",
        secure=False,
        path="/",
    )
    return success_response(LoginResponse(access_token=token, user=UserResponse.model_validate(user)), "Login successful")


@router.post("/logout", response_model=ApiResponse[dict[str, bool]])
def logout(response: Response) -> ApiResponse[dict[str, bool]]:
    response.delete_cookie(key="access_token", path="/")
    return success_response({"loggedOut": True}, "Logout successful")


@router.get("/me", response_model=ApiResponse[UserResponse])
def me(user: User = Depends(get_current_user)) -> ApiResponse[UserResponse]:
    return success_response(UserResponse.model_validate(user))