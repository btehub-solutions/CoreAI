from fastapi import HTTPException
from app.models.user import UserRole, User

def require_owner(current_user: User) -> None:
    if current_user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=403,
            detail="Owner access required for this action"
        )

def require_any(current_user: User) -> None:
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
