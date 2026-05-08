from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import decrypt_value, encrypt_value
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.models import StockDailyData, User
from app.repositories.daily_repo import StockDailyDataRepository
from app.repositories.stock_repo import StockRepository
from app.repositories.token_repo import DbotTokenRepository
from app.repositories.user_repo import UserRepository
from app.schemas.schemas import SignalItem, SignalsResponse

FUTURE_DAYS_BUFFER = 14  # Extra days buffer for holidays/weekends


def _token_for_user(user: User) -> dict:
    token, expires_at = create_access_token(
        {"sub": str(user.id), "username": user.username, "is_admin": user.is_admin}
    )
    return {"access_token": token, "token_type": "bearer", "expires_at": expires_at}


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    async def authenticate(self, username: str, password: str) -> dict | None:
        user = await self.user_repo.get_by_username(username)
        if not user or not user.is_active:
            # Mitigate timing attack: verify against a dummy hash
            from app.core.security import _get_dummy_hash

            verify_password(password, _get_dummy_hash())
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return _token_for_user(user)

    async def register(self, username: str, password: str) -> dict | None:
        existing = await self.user_repo.get_by_username(username)
        # Always hash password first to keep timing constant regardless of existence
        hashed = get_password_hash(password)
        if existing:
            return None
        user = await self.user_repo.create(username, hashed)
        return _token_for_user(user)


class StockService:
    def __init__(self, session: AsyncSession):
        self.stock_repo = StockRepository(session)

    async def get_all_symbols(self) -> list[str]:
        return await self.stock_repo.get_all_symbols()


def _build_future_prices_map(
    signals: list[StockDailyData],
    future_records: list[StockDailyData],
    target_date: date,
    future_days: int,
) -> dict[str, list[float | None]]:
    symbol_dates: defaultdict[str, dict[date, float | None]] = defaultdict(dict)
    for r in future_records:
        price_val = None
        if r.close_price is not None:
            try:
                price_val = float(r.close_price)
            except (ValueError, TypeError):
                price_val = None
        symbol_dates[r.symbol][r.record_date] = price_val

    all_symbols = list({s.symbol for s in signals})
    future_prices_map: dict[str, list[float | None]] = {}
    for symbol in all_symbols:
        prices = []
        for i in range(1, future_days + 1):
            check_date = target_date + timedelta(days=i)
            price = symbol_dates.get(symbol, {}).get(check_date)
            prices.append(price)
        future_prices_map[symbol] = prices
    return future_prices_map


def _build_signal_items(
    raw_signals: list[StockDailyData],
    future_prices_map: dict[str, list[float | None]],
    future_days: int,
) -> list[SignalItem]:
    return [
        SignalItem(
            symbol=s.symbol,
            date=s.record_date,
            volume=s.volume,
            signal=s.signal,
            price_x=float(s.close_price) if s.close_price is not None else None,
            future_prices=future_prices_map.get(s.symbol, [None] * future_days),
        )
        for s in raw_signals
    ]


class SignalService:
    def __init__(self, session: AsyncSession):
        self.daily_repo = StockDailyDataRepository(session)

    async def get_signals(
        self,
        target_date: date,
        future_days: int = 7,
        symbol: str | None = None,
        signal_types: list[str] | None = None,
    ) -> SignalsResponse:
        types = signal_types or ["BUY", "SELL"]
        signals = await self.daily_repo.get_signals_by_date(target_date, types, symbol=symbol)

        buy_signals = [s for s in signals if s.signal == "BUY"]
        sell_signals = [s for s in signals if s.signal == "SELL"]

        future_prices_map: dict[str, list[float | None]] = {}
        if signals and future_days > 0:
            start_future = target_date + timedelta(days=1)
            end_future = target_date + timedelta(days=future_days + FUTURE_DAYS_BUFFER)
            future_records = await self.daily_repo.get_future_prices(
                list({s.symbol for s in signals}), start_future, end_future
            )
            future_prices_map = _build_future_prices_map(
                signals, future_records, target_date, future_days
            )

        return SignalsResponse(
            date=target_date,
            future_days=future_days,
            buy=_build_signal_items(buy_signals, future_prices_map, future_days),
            sell=_build_signal_items(sell_signals, future_prices_map, future_days),
        )


def _serialize_token(token, raw_token: str | None = None) -> dict:
    display = raw_token[:20] + "..." if raw_token else (token.token[:20] + "...")
    return {
        "id": token.id,
        "token": display,
        "expires_at": token.expires_at.date() if token.expires_at else None,
        "updated_at": token.updated_at,
    }


class DbotTokenService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.token_repo = DbotTokenRepository(session)

    async def get_current(self) -> dict | None:
        token = await self.token_repo.get_current()
        if not token:
            return None
        # Decrypt for display without mutating the DB model
        decrypted = None
        try:
            decrypted = decrypt_value(token.token)
        except Exception:
            decrypted = token.token  # May be unencrypted legacy token
        return _serialize_token(token, raw_token=decrypted)

    async def update(self, token: str, expires_at: date | None = None) -> dict:
        expires_dt = None
        if expires_at:
            expires_dt = datetime.combine(expires_at, datetime.min.time()).replace(tzinfo=UTC)
        encrypted = encrypt_value(token)
        new_token = await self.token_repo.create_or_update(encrypted, expires_dt)
        return _serialize_token(new_token, raw_token=token)


class UserAdminService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    async def list_users(self) -> list[dict]:
        users = await self.user_repo.get_all()
        return [
            {
                "id": u.id,
                "username": u.username,
                "is_active": u.is_active,
                "is_admin": u.is_admin,
                "created_at": u.created_at,
            }
            for u in users
        ]

    async def create_user(
        self, username: str, password: str, is_admin: bool = False
    ) -> dict | None:
        existing = await self.user_repo.get_by_username(username)
        if existing:
            return None
        hashed = get_password_hash(password)
        user = await self.user_repo.create(username, hashed, is_admin=is_admin)
        return {
            "id": user.id,
            "username": user.username,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
        }

    async def toggle_active(self, user_id: int, is_active: bool) -> dict | None:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            return None
        user.is_active = is_active
        await self.user_repo.update(user)
        return {
            "id": user.id,
            "username": user.username,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
        }
