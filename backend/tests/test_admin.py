import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_update_dbot_token(client: AsyncClient, admin_auth_headers: dict[str, str]):
    res = await client.patch(
        "/api/v1/admin/dbot-token",
        json={"token": "test-bearer-token-12345"},
        headers=admin_auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["token"].startswith("test-bearer-token-")
    assert data["token"] == "test-bearer-token-12345"


@pytest.mark.asyncio
async def test_get_dbot_token(client: AsyncClient, admin_auth_headers: dict[str, str]):
    # First update
    await client.patch(
        "/api/v1/admin/dbot-token",
        json={"token": "test-bearer-token-12345"},
        headers=admin_auth_headers,
    )

    res = await client.get("/api/v1/admin/dbot-token", headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "id" in data
    assert data["token"] == "test-bearer-token-12345"


@pytest.mark.asyncio
async def test_get_dbot_token_empty(client: AsyncClient, admin_auth_headers: dict[str, str]):
    res = await client.get("/api/v1/admin/dbot-token", headers=admin_auth_headers)
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
async def test_update_dbot_token_rejects_expires_at(
    client: AsyncClient, admin_auth_headers: dict[str, str]
):
    res = await client.patch(
        "/api/v1/admin/dbot-token",
        json={"token": "test-bearer-token-12345", "expires_at": "2025-12-31"},
        headers=admin_auth_headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_update_dbot_token_invalid_body(
    client: AsyncClient, admin_auth_headers: dict[str, str]
):
    res = await client.patch(
        "/api/v1/admin/dbot-token",
        json={"token": "short"},
        headers=admin_auth_headers,
    )
    assert res.status_code == 422
