import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

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
