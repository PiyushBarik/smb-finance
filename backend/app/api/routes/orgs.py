import re
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.organization import Organization, OrganizationMember
from app.models.user import User
from app.schemas.orgs import OrgCreate, OrgUpdate, OrgOut, GSTINValidateRequest, GSTINValidateResponse
from app.services.gstin import validate_gstin
from app.services.billing import check_org_limit, ensure_free_plan

router = APIRouter(prefix="/orgs", tags=["organisations"])


def _make_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


@router.get("/", response_model=List[OrgOut])
def list_orgs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memberships = db.query(OrganizationMember).filter(OrganizationMember.user_id == current_user.id).all()
    return [m.org for m in memberships]


@router.post("/", response_model=OrgOut, status_code=201)
def create_org(
    payload: OrgCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_free_plan(current_user.id, db)
    check_org_limit(current_user, db)
    # Validate GSTIN if provided
    if payload.gst_number:
        result = validate_gstin(payload.gst_number)
        if not result["valid"]:
            raise HTTPException(status_code=400, detail=f"Invalid GSTIN: {result['error']}")

    slug = _make_slug(payload.name)
    if db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{slug}-{current_user.id}"

    org = Organization(name=payload.name, slug=slug, gst_number=payload.gst_number)
    db.add(org)
    db.flush()
    db.add(OrganizationMember(org_id=org.id, user_id=current_user.id, role="owner"))
    db.commit()
    db.refresh(org)
    return org


@router.get("/{org_id}", response_model=OrgOut)
def get_org(org_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    if not db.query(OrganizationMember).filter(
        OrganizationMember.org_id == org_id, OrganizationMember.user_id == current_user.id
    ).first():
        raise HTTPException(status_code=403, detail="Not a member")
    return org


@router.patch("/{org_id}", response_model=OrgOut)
def update_org(
    org_id: int,
    payload: OrgUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    member = db.query(OrganizationMember).filter(
        OrganizationMember.org_id == org_id,
        OrganizationMember.user_id == current_user.id,
    ).first()
    if not member or member.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can edit organisation settings")

    if payload.gst_number is not None:
        if payload.gst_number:
            result = validate_gstin(payload.gst_number)
            if not result["valid"]:
                raise HTTPException(status_code=400, detail=f"Invalid GSTIN: {result['error']}")
        org.gst_number = payload.gst_number or None

    if payload.name:
        org.name = payload.name.strip()

    db.commit()
    db.refresh(org)
    return org


@router.post("/validate-gstin", response_model=GSTINValidateResponse)
def validate_gstin_endpoint(payload: GSTINValidateRequest):
    result = validate_gstin(payload.gstin)
    return GSTINValidateResponse(**result)
