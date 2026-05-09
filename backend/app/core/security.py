import logging
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

logger = logging.getLogger("dbot-backend")

pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated=["bcrypt"],
    argon2__time_cost=2,
    argon2__memory_cost=65536,
    argon2__parallelism=1,
)

# Pre-computed dummy hash for timing-attack mitigation
# Computed lazily to avoid slow bcrypt at import time
_DUMMY_HASH: str | None = None

JWT_ISSUER = "dbot-backend"
JWT_AUDIENCE = "dbot-frontend"


def _truncate_password(password: str) -> bytes:
    # bcrypt has a maximum password length of 72 bytes
    return password.encode("utf-8")[:72]


def _get_dummy_hash() -> str:
    global _DUMMY_HASH
    if _DUMMY_HASH is None:
        _DUMMY_HASH = pwd_context.hash("dummy")
    return _DUMMY_HASH


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_truncate_password(plain_password), hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(_truncate_password(password))


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> tuple[str, datetime]:
    """Create JWT and return (token_string, expires_at)."""
    settings = get_settings()
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update(
        {
            "exp": expire,
            "iat": now,
            "iss": JWT_ISSUER,
            "aud": JWT_AUDIENCE,
            "jti": str(uuid4()),
        }
    )
    token = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return token, expire


def decode_access_token(token: str) -> dict | None:
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
            leeway=60,
        )
    except jwt.ExpiredSignatureError:
        logger.debug("JWT decode failed: token expired")
        return None
    except jwt.InvalidTokenError as exc:
        logger.debug("JWT decode failed: %s", exc)
        return None
