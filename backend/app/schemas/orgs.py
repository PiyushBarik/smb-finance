from pydantic import BaseModel, field_validator
from typing import Optional
import re


class OrgCreate(BaseModel):
    name: str
    gst_number: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Organisation name cannot be empty")
        return v.strip()


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    gst_number: Optional[str] = None


class OrgOut(BaseModel):
    id: int
    name: str
    slug: str
    gst_number: Optional[str] = None

    class Config:
        from_attributes = True


class GSTINValidateRequest(BaseModel):
    gstin: str


class GSTINValidateResponse(BaseModel):
    valid: bool
    state: Optional[str] = None
    state_code: Optional[str] = None
    pan: Optional[str] = None
    error: Optional[str] = None
