from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)


class DbotToken(Base, TimestampMixin):
    __tablename__ = "dbot_token"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Stock(Base, TimestampMixin):
    __tablename__ = "stocks"

    symbol: Mapped[str] = mapped_column(String(20), primary_key=True)
    is_index: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    daily_data: Mapped[list["StockDailyData"]] = relationship(back_populates="stock")


class StockDailyData(Base, TimestampMixin):
    __tablename__ = "stock_daily_data"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), ForeignKey("stocks.symbol"), nullable=False)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    close_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    volume: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    prev_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    signal: Mapped[str | None] = mapped_column(String(4), nullable=True)
    source_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    stock: Mapped["Stock"] = relationship(back_populates="daily_data")

    __table_args__ = (
        UniqueConstraint("symbol", "record_date", name="uq_stock_date"),
        Index("idx_daily_date_signal", "record_date", "signal"),
        Index("idx_daily_symbol_date", "symbol", "record_date"),
        Index("idx_daily_source_id", "source_id"),
    )


class Watchlist(Base, TimestampMixin):
    __tablename__ = "watchlists"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symbol: Mapped[str] = mapped_column(String(20), ForeignKey("stocks.symbol", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "symbol", name="uq_user_symbol"),
        Index("idx_watchlist_user", "user_id"),
        Index("idx_watchlist_symbol", "symbol"),
    )
