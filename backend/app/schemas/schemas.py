from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


def _normalize_username(v: str) -> str:
    v = v.strip().lower()
    if not v.replace("_", "").replace("-", "").isalnum():
        raise ValueError("Username must be alphanumeric (underscores and hyphens allowed)")
    return v


class UserRegister(UserBase):
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        return _normalize_username(v)


class UserLogin(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    is_admin: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


class SignalItem(BaseModel):
    symbol: str
    date: date
    volume: int | None
    signal: str
    price_x: float | None
    future_prices: list[float | None]


class SignalsResponse(BaseModel):
    date: date
    future_days: int
    buy: list[SignalItem]
    sell: list[SignalItem]


class DbotTokenUpdate(BaseModel):
    token: str = Field(..., min_length=10)
    expires_at: date | None = None


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    is_admin: bool = False

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        return _normalize_username(v)


class UserListItem(BaseModel):
    id: int
    username: str
    is_active: bool
    is_admin: bool
    created_at: datetime


class UserToggleActive(BaseModel):
    is_active: bool



