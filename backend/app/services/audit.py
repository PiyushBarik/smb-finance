"""
Audit log helpers.
Call log_action() after any state-changing operation.
"""
import json
from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog


def log_action(
    db: Session,
    action: str,
    user_id: Optional[int] = None,
    org_id: Optional[int] = None,
    resource: Optional[str] = None,
    detail: Optional[dict] = None,
    ip_address: Optional[str] = None,
):
    """
    action examples:
        auth.register  auth.login
        org.create     org.update
        upload.csv     upload.batch_delete
        reconcile.run
        invite.create  invite.accept  invite.revoke
        member.role_change  member.remove
        api_key.create  api_key.revoke
        txn.category_edit
    """
    entry = AuditLog(
        action=action,
        user_id=user_id,
        org_id=org_id,
        resource=resource,
        detail=json.dumps(detail) if detail else None,
        ip_address=ip_address,
    )
    db.add(entry)
    # Don't commit here — caller handles the transaction
