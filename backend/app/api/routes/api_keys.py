"""
API Key management.
Keys are prefixed with cb_live_ and hashed before storage.
The full key is only shown once at creation.
"""
import secrets
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, check_org_membership
from app.models.api_key import APIKey
from app.models.user import User
from app.schemas.api_keys import APIKeyCreate, APIKeyOut, APIKeyCreated
from app.services.audit import log_action
import bcrypt

router = APIRouter(prefix="/api-keys", tags=["api keys"])


@router.get("/{org_id}", response_model=List[APIKeyOut])
def list_keys(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_org_membership(org_id, current_user, db)
    return db.query(APIKey).filter(
        APIKey.org_id == org_id,
        APIKey.is_active == True,  # noqa
    ).order_by(APIKey.created_at.desc()).all()


@router.post("/{org_id}", response_model=APIKeyCreated, status_code=201)
def create_key(
    org_id: int,
    payload: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = check_org_membership(org_id, current_user, db)
    if m.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can create API keys")

    # Generate: cb_live_<48 random chars>
    raw_key    = f"cb_live_{secrets.token_urlsafe(36)}"
    key_prefix = raw_key[:16]                                    # "cb_live_xxxxxxxx"
    key_hash   = bcrypt.hashpw(raw_key.encode(), bcrypt.gensalt()).decode()

    key = APIKey(
        org_id     = org_id,
        created_by = current_user.id,
        name       = payload.name,
        key_prefix = key_prefix,
        key_hash   = key_hash,
    )
    db.add(key)
    log_action(db, "api_key.create", user_id=current_user.id, org_id=org_id,
               resource=f"key:{payload.name}")
    db.commit()
    db.refresh(key)

    return APIKeyCreated(
        id=key.id, name=key.name, key_prefix=key.key_prefix,
        is_active=key.is_active, created_at=key.created_at,
        last_used=key.last_used, expires_at=key.expires_at,
        full_key=raw_key,
    )


@router.delete("/{org_id}/{key_id}", response_model=dict)
def revoke_key(
    org_id: int,
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = check_org_membership(org_id, current_user, db)
    if m.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can revoke API keys")

    key = db.query(APIKey).filter(
        APIKey.id == key_id, APIKey.org_id == org_id
    ).first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    key.is_active = False
    log_action(db, "api_key.revoke", user_id=current_user.id, org_id=org_id,
               resource=f"key:{key.name}")
    db.commit()
    return {"message": "API key revoked"}
