from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, check_org_membership
from app.models.audit import AuditLog
from app.models.user import User
from pydantic import BaseModel
import datetime

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogOut(BaseModel):
    id:         int
    action:     str
    user_id:    Optional[int] = None
    resource:   Optional[str] = None
    detail:     Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


@router.get("/{org_id}", response_model=List[AuditLogOut])
def get_audit_log(
    org_id: int,
    limit: int = Query(100, ge=1, le=500),
    action: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = check_org_membership(org_id, current_user, db)
    if m.role not in ("owner", "admin"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only owners and admins can view audit logs")

    q = db.query(AuditLog).filter(AuditLog.org_id == org_id)
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    return q.order_by(AuditLog.created_at.desc()).limit(limit).all()
