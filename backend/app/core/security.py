from fastapi.security import OAuth2PasswordBearer

from .config import settings


oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

__all__ = ["oauth2_scheme", "oauth2_scheme_optional"]
