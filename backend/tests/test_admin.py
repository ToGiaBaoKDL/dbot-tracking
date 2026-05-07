import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_update_dbot_token(client: AsyncClient, auth_headers: dict[str, str]):
    res = await client.patch(
        "/api/v1/admin/dbot-token",
        json={"token": "test-bearer-token-12345"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["token"].startswith("test-bearer-token-")
    assert data["token"].endswith("...")
    assert data["expires_at"] is None


@pytest.mark.asyncio
async def test_get_dbot_token(client: AsyncClient, auth_headers: dict[str, str]):
    # First update
    await client.patch(
        "/api/v1/admin/dbot-token",
        json={"token": "test-bearer-token-12345"},
        headers=auth_headers,
    )

    res = await client.get("/api/v1/admin/dbot-token", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "id" in data
    assert "token" in data


@pytest.mark.asyncio
async def test_get_dbot_token_empty(client: AsyncClient, auth_headers: dict[str, str]):
    res = await client.get("/api/v1/admin/dbot-token", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == {"message": "No token configured"}


@pytest.mark.asyncio
async def test_update_dbot_token_unauthorized(client: AsyncClient):
    res = await client.patch(
        "/api/v1/admin/dbot-token",
        json={"token": "test-token"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_update_dbot_token_with_expires_at(client: AsyncClient, auth_headers: dict[str, str]):
    res = await client.patch(
        "/api/v1/admin/dbot-token",
        json={"token": "test-bearer-token-12345", "expires_at": "2025-12-31"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["expires_at"] == "2025-12-31"


@pytest.mark.asyncio
async def test_update_dbot_token_invalid_body(client: AsyncClient, auth_headers: dict[str, str]):
    res = await client.patch(
        "/api/v1/admin/dbot-token",
        json={"token": "short"},
        headers=auth_headers,
    )
    assert res.status_code == 422
