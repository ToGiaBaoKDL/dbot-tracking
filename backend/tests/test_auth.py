import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    res = await client.post(
        "/api/v1/auth/register",
        json={"username": "newuser", "password": "securepass123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"username": "dupuser", "password": "pass123"},
    )
    res = await client.post(
        "/api/v1/auth/register",
        json={"username": "dupuser", "password": "pass123"},
    )
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_invalid_username(client: AsyncClient):
    res = await client.post(
        "/api/v1/auth/register",
        json={"username": "ab", "password": "short"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, auth_token: str):
    assert auth_token
    assert isinstance(auth_token, str)
    assert "." in auth_token  # JWT has dots


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    res = await client.post(
        "/api/v1/auth/login",
        json={"username": "nouser", "password": "wrongpass"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_missing_fields(client: AsyncClient):
    res = await client.post("/api/v1/auth/login", json={})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_me_endpoint(client: AsyncClient, auth_headers: dict[str, str]):
    res = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "id" in data
    assert "username" in data
