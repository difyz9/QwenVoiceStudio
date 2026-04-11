from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyCookie
from jose import JWTError
from sqlalchemy.orm import Session

from backend.app.core.security import decode_token
from backend.app.db.session import get_db
from backend.app.db_models.user import User

cookie_auth = APIKeyCookie(
    name="access_token",
    auto_error=False,
    description="JWT access token stored in the access_token cookie after login.",
)


def get_current_user(
    db: Session = Depends(get_db),
    access_token: str | None = Security(cookie_auth),
) -> User:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_token(access_token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = db.query(User).filter(User.username == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user