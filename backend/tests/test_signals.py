from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.daily_repo import StockDailyDataRepository
from app.repositories.stock_repo import StockRepository


@pytest.mark.asyncio
async def test_get_signals_empty(client: AsyncClient, auth_headers: dict[str, str]):
    res = await client.get(
        "/api/v1/signals?date=2024-01-01&future_days=7",
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["date"] == "2024-01-01"
    assert data["future_days"] == 7
    assert data["buy"] == []
    assert data["sell"] == []


@pytest.mark.asyncio
async def test_get_signals_with_data(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
):
    # Seed data
    stock_repo = StockRepository(db_session)
    await stock_repo.upsert_stocks(["VIC", "VHM"], is_index=False)

    daily_repo = StockDailyDataRepository(db_session)
    await daily_repo.upsert_many(
        [
            {
                "symbol": "VIC",
                "record_date": date(2024, 1, 15),
                "close_price": 50.0,
                "volume": 1000000,
                "signal": "BUY",
            },
            {
                "symbol": "VHM",
                "record_date": date(2024, 1, 15),
                "close_price": 30.0,
                "volume": 500000,
                "signal": "SELL",
            },
            {
                "symbol": "VIC",
                "record_date": date(2024, 1, 16),
                "close_price": 51.0,
                "volume": 1100000,
                "signal": None,
            },
        ]
    )
    await db_session.commit()

    res = await client.get(
        "/api/v1/signals?date=2024-01-15&future_days=1",
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["buy"]) == 1
    assert data["buy"][0]["symbol"] == "VIC"
    assert data["buy"][0]["future_prices"] == [51.0]
    assert len(data["sell"]) == 1
    assert data["sell"][0]["symbol"] == "VHM"
    assert data["sell"][0]["future_prices"] == [None]
    assert data["future_dates"] == ["2024-01-16"]


@pytest.mark.asyncio
async def test_get_signals_weekend_skip(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
):
    """Future dates should skip Saturday/Sunday when target is Friday."""
    stock_repo = StockRepository(db_session)
    await stock_repo.upsert_stocks(["VIC"], is_index=False)

    daily_repo = StockDailyDataRepository(db_session)
    # Target = Friday 2024-01-12
    # Weekend = 2024-01-13 (Sat), 2024-01-14 (Sun)
    # Next trading days = Mon 2024-01-15, Tue 2024-01-16, Wed 2024-01-17
    await daily_repo.upsert_many(
        [
            {
                "symbol": "VIC",
                "record_date": date(2024, 1, 12),
                "close_price": 50.0,
                "volume": 1000000,
                "signal": "BUY",
            },
            {
                "symbol": "VIC",
                "record_date": date(2024, 1, 15),
                "close_price": 51.0,
                "volume": 1100000,
                "signal": None,
            },
            {
                "symbol": "VIC",
                "record_date": date(2024, 1, 16),
                "close_price": 52.0,
                "volume": 1200000,
                "signal": None,
            },
            {
                "symbol": "VIC",
                "record_date": date(2024, 1, 17),
                "close_price": 53.0,
                "volume": 1300000,
                "signal": None,
            },
        ]
    )
    await db_session.commit()

    res = await client.get(
        "/api/v1/signals?date=2024-01-12&future_days=3",
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["future_dates"] == ["2024-01-15", "2024-01-16", "2024-01-17"]
    assert data["buy"][0]["future_prices"] == [51.0, 52.0, 53.0]


@pytest.mark.asyncio
async def test_get_signals_unauthorized(client: AsyncClient):
    res = await client.get("/api/v1/signals?date=2024-01-01&future_days=7")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_get_signals_invalid_future_days(client: AsyncClient, auth_headers: dict[str, str]):
    res = await client.get(
        "/api/v1/signals?date=2024-01-01&future_days=0",
        headers=auth_headers,
    )
    assert res.status_code == 422

    res = await client.get(
        "/api/v1/signals?date=2024-01-01&future_days=15",
        headers=auth_headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_get_signals_missing_date(client: AsyncClient, auth_headers: dict[str, str]):
    res = await client.get("/api/v1/signals?future_days=7", headers=auth_headers)
    assert res.status_code == 422
