from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import decrypt_value, encrypt_value
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.models import StockDailyData, User
from app.repositories.daily_repo import StockDailyDataRepository
from app.repositories.stock_repo import StockRepository
from app.repositories.token_repo import DbotTokenRepository
from app.repositories.user_repo import UserRepository
from app.repositories.watchlist_repo import WatchlistRepository
from app.schemas.schemas import (
    SignalItem,
    SignalsResponse,
    WatchlistItem,
    WatchlistWithLatestSignal,
)

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
        # Always hash password first to keep timing constant regardless of existence
        hashed = get_password_hash(password)
        try:
            user = await self.user_repo.create(username, hashed)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            return None
        return _token_for_user(user)


class StockService:
    def __init__(self, session: AsyncSession):
        self.stock_repo = StockRepository(session)

    async def get_all_symbols(self) -> list[str]:
        return await self.stock_repo.get_all_symbols()


def _get_trading_dates(
    target_date: date,
    count: int,
    exclude_dates: set[date] | None = None,
) -> list[date]:
    """Return the next `count` trading dates (Mon-Fri, excluding holidays) after target_date."""
    excluded = exclude_dates or set()
    trading_dates: list[date] = []
    offset = 1
    while len(trading_dates) < count:
        d = target_date + timedelta(days=offset)
        if d.weekday() < 5 and d not in excluded:
            trading_dates.append(d)
        offset += 1
    return trading_dates


def _build_future_prices_map(
    signals: list[StockDailyData],
    future_records: list[StockDailyData],
    target_date: date,
    future_days: int,
    exclude_dates: set[date] | None = None,
) -> tuple[dict[str, list[float | None]], list[str]]:
    symbol_dates: defaultdict[str, dict[date, float | None]] = defaultdict(dict)
    for r in future_records:
        price_val = None
        if r.close_price is not None:
            try:
                price_val = float(r.close_price)
            except (ValueError, TypeError):
                price_val = None
        symbol_dates[r.symbol][r.record_date] = price_val

    trading_dates = _get_trading_dates(target_date, future_days, exclude_dates)
    future_dates = [d.isoformat() for d in trading_dates]

    all_symbols = list({s.symbol for s in signals})
    future_prices_map: dict[str, list[float | None]] = {}
    for symbol in all_symbols:
        prices = []
        for d in trading_dates:
            price = symbol_dates.get(symbol, {}).get(d)
            prices.append(price)
        future_prices_map[symbol] = prices
    return future_prices_map, future_dates


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
        exclude_dates: list[date] | None = None,
    ) -> SignalsResponse:
        types = signal_types or ["BUY", "SELL"]
        signals = await self.daily_repo.get_signals_by_date(target_date, types, symbol=symbol)

        buy_signals = [s for s in signals if s.signal == "BUY"]
        sell_signals = [s for s in signals if s.signal == "SELL"]

        excluded_set = set(exclude_dates) if exclude_dates else None

        future_prices_map: dict[str, list[float | None]] = {}
        future_dates: list[str] = []
        if signals and future_days > 0:
            start_future = target_date + timedelta(days=1)
            end_future = target_date + timedelta(days=future_days + FUTURE_DAYS_BUFFER)
            future_records = await self.daily_repo.get_future_prices(
                list({s.symbol for s in signals}), start_future, end_future
            )
            future_prices_map, future_dates = _build_future_prices_map(
                signals, future_records, target_date, future_days, excluded_set
            )

        return SignalsResponse(
            date=target_date,
            future_days=future_days,
            future_dates=future_dates,
            buy=_build_signal_items(buy_signals, future_prices_map, future_days),
            sell=_build_signal_items(sell_signals, future_prices_map, future_days),
        )


def _serialize_token(token, raw_token: str | None = None) -> dict:
    return {
        "id": token.id,
        "token": raw_token or token.token,
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

    async def update(self, token: str) -> dict:
        encrypted = encrypt_value(token)
        new_token = await self.token_repo.create_or_update(encrypted)
        await self.session.commit()
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
        hashed = get_password_hash(password)
        try:
            user = await self.user_repo.create(username, hashed, is_admin=is_admin)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            return None
        return {
            "id": user.id,
            "username": user.username,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
        }

    async def toggle_active(self, user_id: int, is_active: bool, admin_user_id: int) -> dict | None:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            return None
        if user.id == admin_user_id:
            raise ValueError("Cannot deactivate your own account")
        if user.is_admin:
            raise ValueError("Cannot deactivate an admin user")
        user.is_active = is_active
        await self.user_repo.update(user)
        await self.session.commit()
        return {
            "id": user.id,
            "username": user.username,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
        }


class WatchlistService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.watchlist_repo = WatchlistRepository(session)
        self.daily_repo = StockDailyDataRepository(session)
        self.stock_repo = StockRepository(session)

    async def get_watchlist(self, user_id: int) -> list[WatchlistWithLatestSignal]:
        symbols = await self.watchlist_repo.get_symbols_by_user(user_id)
        if not symbols:
            return []

        # Subquery: latest date per symbol
        subq = (
            select(
                StockDailyData.symbol,
                StockDailyData.record_date,
                StockDailyData.close_price,
                StockDailyData.volume,
                StockDailyData.signal,
                StockDailyData.prev_price,
            )
            .where(StockDailyData.symbol.in_(symbols))
            .order_by(StockDailyData.symbol, StockDailyData.record_date.desc())
            .distinct(StockDailyData.symbol)
        )

        result = await self.session.execute(subq)
        rows = result.all()

        items: list[WatchlistWithLatestSignal] = []
        for row in rows:
            close_price = float(row.close_price) if row.close_price is not None else None
            prev_price = float(row.prev_price) if row.prev_price is not None else None
            change_pct = None
            if close_price is not None and prev_price is not None and prev_price > 0:
                change_pct = ((close_price - prev_price) / prev_price) * 100

            items.append(
                WatchlistWithLatestSignal(
                    symbol=row.symbol,
                    latest_signal=row.signal,
                    latest_date=row.record_date,
                    close_price=close_price,
                    volume=row.volume,
                    change_pct=change_pct,
                    is_in_watchlist=True,
                )
            )

        # Sort by symbol
        items.sort(key=lambda x: x.symbol)
        return items

    async def add_symbol(self, user_id: int, symbol: str) -> WatchlistItem:
        normalized = symbol.strip().upper()
        # Verify symbol exists in stocks table
        all_symbols = await self.stock_repo.get_all_symbols()
        if normalized not in all_symbols:
            raise ValueError(f"Không tìm thấy mã {normalized}")

        try:
            item = await self.watchlist_repo.add(user_id, normalized)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise ValueError(f"Mã {normalized} đã có trong danh sách theo dõi") from None
        return WatchlistItem.model_validate(item)

    async def remove_symbol(self, user_id: int, symbol: str) -> bool:
        normalized = symbol.strip().upper()
        deleted = await self.watchlist_repo.remove(user_id, normalized)
        await self.session.commit()
        return deleted
