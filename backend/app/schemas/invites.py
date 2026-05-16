from __future__ import annotations
import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional


class InviteCreate(BaseModel):
    email: EmailStr
    role: str = "viewer"          # viewer | admin | owner


class InviteOut(BaseModel):
    id:         int
    email:      str
    role:       str
    accepted:   bool
    created_at: datetime.datetime
    expires_at: datetime.datetime
    invite_url: Optional[str] = None   # populated on create

    class Config:
        from_attributes = True


class InviteAcceptRequest(BaseModel):
    token: str


class MemberOut(BaseModel):
    id:       int
    user_id:  int
    role:     str
    name:     str
    email:    str

    class Config:
        from_attributes = True
