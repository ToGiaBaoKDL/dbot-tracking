from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.schemas.schemas import DbotTokenUpdate, UserCreate, UserListItem, UserToggleActive
from app.services.services import DbotTokenService, UserAdminService

router = APIRouter()


@router.get("/dbot-token", response_model=dict)
async def get_dbot_token(
    db: AsyncSession = Depends(get_db),
    admin_user: dict = Depends(require_admin),
):
    service = DbotTokenService(db)
    token = await service.get_current()
    if not token:
        return {"message": "No token configured"}
    return token


@router.patch("/dbot-token", response_model=dict)
async def update_dbot_token(
    data: DbotTokenUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: dict = Depends(require_admin),
):
    service = DbotTokenService(db)
    return await service.update(data.token, data.expires_at)


@router.get("/users", response_model=list[UserListItem])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin_user: dict = Depends(require_admin),
):
    service = UserAdminService(db)
    return await service.list_users()


@router.post("/users", response_model=dict)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: dict = Depends(require_admin),
):
    service = UserAdminService(db)
    result = await service.create_user(data.username, data.password, data.is_admin)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )
    return result


@router.patch("/users/{user_id}", response_model=dict)
async def toggle_user_active(
    user_id: int,
    data: UserToggleActive,
    db: AsyncSession = Depends(get_db),
    admin_user: dict = Depends(require_admin),
):
    service = UserAdminService(db)
    try:
        result = await service.toggle_active(user_id, data.is_active, admin_user["id"])
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return result
