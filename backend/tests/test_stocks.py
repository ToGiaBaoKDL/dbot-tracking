from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import StockDailyData
from app.repositories.stock_repo import StockRepository


@pytest.mark.asyncio
async def test_get_stocks_empty(client: AsyncClient, auth_headers: dict[str, str]):
    res = await client.get("/api/v1/stocks", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == {"symbols": []}


@pytest.mark.asyncio
async def test_get_stocks_with_data(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
):
    repo = StockRepository(db_session)
    await repo.upsert_stocks(["VIC"], is_index=False)
    await repo.upsert_stocks(["VNINDEX"], is_index=True)
    await db_session.commit()

    res = await client.get("/api/v1/stocks", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data == {"symbols": ["VIC"]}


@pytest.mark.asyncio
async def test_get_stocks_unauthorized(client: AsyncClient):
    res = await client.get("/api/v1/stocks")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_get_stock_history_empty(client: AsyncClient, auth_headers: dict[str, str]):
    res = await client.get("/api/v1/stocks/NONE/history", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.asyncio
async def test_get_stock_history(
    client: AsyncClient,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
):
    repo = StockRepository(db_session)
    await repo.upsert_stocks(["VIC"], is_index=False)
    await db_session.commit()

    db_session.add(
        StockDailyData(
            symbol="VIC",
            record_date=date(2024, 1, 1),
            close_price=Decimal("100.00"),
            volume=1_000_000,
            signal="BUY",
        )
    )
    db_session.add(
        StockDailyData(
            symbol="VIC",
            record_date=date(2024, 1, 2),
            close_price=Decimal("105.00"),
            volume=1_200_000,
            signal=None,
        )
    )
    await db_session.commit()

    res = await client.get("/api/v1/stocks/VIC/history", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    # DESC order
    assert data[0]["record_date"] == "2024-01-02"
    assert data[0]["close_price"] == 105.0
    assert data[0]["signal"] is None
    assert data[1]["record_date"] == "2024-01-01"
    assert data[1]["close_price"] == 100.0
    assert data[1]["signal"] == "BUY"


@pytest.mark.asyncio
async def test_get_stock_history_unauthorized(client: AsyncClient):
    res = await client.get("/api/v1/stocks/VIC/history")
    assert res.status_code == 401
