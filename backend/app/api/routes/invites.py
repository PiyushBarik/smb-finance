"""
Team invite and member management.
IMPORTANT: Static routes (/accept, /revoke) MUST be defined before
           parameterised routes (/{org_id}) so FastAPI matches them first.
"""
import secrets
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, check_org_membership
from app.models.invite import Invite
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.invites import InviteCreate, InviteOut, InviteAcceptRequest, MemberOut
from app.services.audit import log_action

router = APIRouter(prefix="/invites", tags=["team"])

INVITE_EXPIRE_DAYS = 7
ALLOWED_ROLES = {"viewer", "admin", "owner"}


def _require_admin(org_id: int, user: User, db: Session) -> OrganizationMember:
    m = check_org_membership(org_id, user, db)
    if m.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can manage team")
    return m


# ── STATIC ROUTES FIRST (before any /{org_id} routes) ────────────────────────

@router.post("/accept", response_model=dict)
def accept_invite(
    payload: InviteAcceptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invite = db.query(Invite).filter(Invite.token == payload.token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite token")
    if invite.accepted:
        raise HTTPException(status_code=400, detail="Invite already used")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invite has expired")
    if invite.email.lower() != current_user.email.lower():
        raise HTTPException(status_code=403, detail="This invite was for a different email address")

    already = db.query(OrganizationMember).filter(
        OrganizationMember.org_id  == invite.org_id,
        OrganizationMember.user_id == current_user.id,
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="You are already a member of this organisation")

    db.add(OrganizationMember(org_id=invite.org_id, user_id=current_user.id, role=invite.role))
    invite.accepted = True
    log_action(db, "invite.accept", user_id=current_user.id, org_id=invite.org_id, resource=f"invite:{invite.id}")
    db.commit()
    return {"message": "You have joined the organisation.", "org_id": invite.org_id}


@router.delete("/revoke/{invite_id}", response_model=dict)
def revoke_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invite = db.query(Invite).filter(Invite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    _require_admin(invite.org_id, current_user, db)
    db.delete(invite)
    db.commit()
    return {"message": "Invite revoked"}


# ── PARAMETERISED ROUTES AFTER ────────────────────────────────────────────────

@router.post("/{org_id}", response_model=InviteOut, status_code=201)
def create_invite(
    org_id: int,
    payload: InviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(org_id, current_user, db)
    if payload.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {ALLOWED_ROLES}")

    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        already = db.query(OrganizationMember).filter(
            OrganizationMember.org_id  == org_id,
            OrganizationMember.user_id == existing_user.id,
        ).first()
        if already:
            raise HTTPException(status_code=400, detail="User is already a member")

    # Invalidate any previous pending invite for same email+org
    db.query(Invite).filter(
        Invite.org_id == org_id,
        Invite.email  == payload.email,
        Invite.accepted == False,  # noqa
    ).delete()

    token  = secrets.token_urlsafe(32)
    invite = Invite(
        org_id=org_id, invited_by=current_user.id,
        email=payload.email, role=payload.role, token=token,
        expires_at=datetime.utcnow() + timedelta(days=INVITE_EXPIRE_DAYS),
    )
    db.add(invite)
    log_action(db, "invite.create", user_id=current_user.id, org_id=org_id, resource=f"invite:{payload.email}", detail={"role": payload.role})
    db.commit()
    db.refresh(invite)

    out = InviteOut.model_validate(invite)
    out.invite_url = f"http://localhost:3000/accept-invite?token={token}"
    return out


@router.get("/{org_id}", response_model=List[InviteOut])
def list_invites(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(org_id, current_user, db)
    return db.query(Invite).filter(
        Invite.org_id == org_id,
        Invite.accepted == False,  # noqa
        Invite.expires_at > datetime.utcnow(),
    ).all()


@router.get("/{org_id}/members", response_model=List[MemberOut])
def list_members(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_org_membership(org_id, current_user, db)
    return [
        MemberOut(id=m.id, user_id=m.user_id, role=m.role, name=m.user.name, email=m.user.email)
        for m in db.query(OrganizationMember).filter(OrganizationMember.org_id == org_id).all()
    ]


@router.patch("/{org_id}/members/{member_id}", response_model=dict)
def update_member_role(
    org_id: int, member_id: int, role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(org_id, current_user, db)
    if role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {ALLOWED_ROLES}")
    member = db.query(OrganizationMember).filter(
        OrganizationMember.id == member_id, OrganizationMember.org_id == org_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner" and role != "owner":
        owners = db.query(OrganizationMember).filter(
            OrganizationMember.org_id == org_id, OrganizationMember.role == "owner"
        ).count()
        if owners <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last owner")
    member.role = role
    db.commit()
    return {"message": f"Role updated to {role}"}


@router.delete("/{org_id}/members/{member_id}", response_model=dict)
def remove_member(
    org_id: int, member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(org_id, current_user, db)
    member = db.query(OrganizationMember).filter(
        OrganizationMember.id == member_id, OrganizationMember.org_id == org_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself")
    db.delete(member)
    db.commit()
    return {"message": "Member removed"}
