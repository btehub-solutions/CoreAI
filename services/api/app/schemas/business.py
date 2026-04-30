from pydantic import BaseModel
from app.models.business import SectorType
from uuid import UUID

class BusinessBase(BaseModel):
    name: str
    sector: SectorType
    phone: str | None = None
    city: str | None = None
    state: str | None = None

class BusinessRead(BusinessBase):
    id: UUID
    
    class Config:
        from_attributes = True
