from __future__ import annotations
import datetime
from pydantic import BaseModel
from typing import Optional


class APIKeyCreate(BaseModel):
    name: str


class APIKeyOut(BaseModel):
    id:         int
    name:       str
    key_prefix: str
    is_active:  bool
    created_at: datetime.datetime
    last_used:  Optional[datetime.datetime] = None
    expires_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class APIKeyCreated(APIKeyOut):
    """Returned only once on creation — contains the full plaintext key."""
    full_key: str
