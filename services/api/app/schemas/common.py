from typing import TypeVar, Generic, Optional, List, Any
from pydantic import BaseModel

T = TypeVar("T")

class Meta(BaseModel):
    page: int = 1
    per_page: int = 20
    total: int

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    message: Optional[str] = None

class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: List[T]
    meta: Meta

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[Any] = None
