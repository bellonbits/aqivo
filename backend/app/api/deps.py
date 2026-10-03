"""Authentication + tenant resolution. The tenant is derived from the authenticated identity
(membership row or a signed impersonation claim) — a business_id sent by the client is never trusted."""
import uuid
from dataclasses import dataclass, field

import jwt
from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import forbidden, upgrade_required
from app.core.permissions import ASSIGNED_ONLY_ROLES, role_has
from app.core.security import decode_token
from app.models import Business, BusinessMember, User
from app.models.enums import BusinessRole, BusinessStatus, PlatformRole
from app.services.audit import audit
from app.services.plans import has_feature

from fastapi import HTTPException, status


def _unauthorized(msg: str = "Not authenticated") -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, msg, headers={"WWW-Authenticate": "Bearer"})


@dataclass
class AuthState:
    user: User
    claims: dict


@dataclass
class TenantContext:
    user: User
    business: Business
    role: str
    staff_id: uuid.UUID | None = None
    impersonator_id: uuid.UUID | None = None
    db: Session | None = field(default=None, repr=False)

    @property
    def business_id(self) -> uuid.UUID:
        return self.business.id

    @property
    def assigned_only(self) -> bool:
        return self.role in ASSIGNED_ONLY_ROLES

    def can(self, permission: str) -> bool:
        return role_has(self.role, permission)


def get_auth(request: Request, authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> AuthState:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _unauthorized()
    try:
        claims = decode_token(authorization.split(" ", 1)[1], "access")
        user_id = uuid.UUID(claims["sub"])
    except (jwt.PyJWTError, ValueError, KeyError):
        raise _unauthorized("Invalid or expired token")
    user = db.get(User, user_id)
    if not user or user.deleted_at or not user.is_active:
        raise _unauthorized("Account disabled")
    request.state.user_id = str(user.id)
    return AuthState(user=user, claims=claims)


def get_current_user(auth: AuthState = Depends(get_auth)) -> User:
    return auth.user


def require_platform_admin(auth: AuthState = Depends(get_auth)) -> User:
    if auth.user.platform_role not in (PlatformRole.ADMIN, PlatformRole.SUPER_ADMIN):
        raise forbidden("Admin access required")
    if auth.claims.get("imp"):
        raise forbidden("Exit impersonation to use admin tools")
    return auth.user


def require_super_admin(user: User = Depends(require_platform_admin)) -> User:
    if user.platform_role != PlatformRole.SUPER_ADMIN:
        raise forbidden("Super admin access required")
    return user


def get_tenant(request: Request, auth: AuthState = Depends(get_auth), db: Session = Depends(get_db),
               x_business_id: str | None = Header(default=None)) -> TenantContext:
    user, claims = auth.user, auth.claims
    imp = claims.get("imp")
    if imp:  # signed at impersonation time by an admin, audited there
        admin = db.get(User, uuid.UUID(imp["by"]))
        if not admin or admin.platform_role not in (PlatformRole.ADMIN, PlatformRole.SUPER_ADMIN):
            raise _unauthorized("Impersonation no longer valid")
        business = db.get(Business, uuid.UUID(imp["business_id"]))
        if not business or business.deleted_at:
            raise _unauthorized("Business not found")
        if request.method not in ("GET", "HEAD", "OPTIONS"):  # every change made while impersonating is attributable
            audit(db, "impersonation.action", user_id=user.id, business_id=business.id, impersonator_id=admin.id, request=request,
                  meta={"method": request.method, "path": request.url.path})
        return TenantContext(user=user, business=business, role=BusinessRole.BUSINESS_OWNER,
                             impersonator_id=admin.id, db=db)

    q = select(BusinessMember).where(BusinessMember.user_id == user.id, BusinessMember.is_active.is_(True))
    memberships = list(db.scalars(q))
    if not memberships:
        raise forbidden("No business is linked to this account")
    member = memberships[0]
    if x_business_id:  # a *selector* among the user's own memberships, never a grant
        try:
            wanted = uuid.UUID(x_business_id)
        except ValueError:
            raise forbidden("Invalid business")
        match = next((m for m in memberships if m.business_id == wanted), None)
        if match is None:
            raise forbidden("You don't belong to that business")
        member = match
    business = db.get(Business, member.business_id)
    if not business or business.deleted_at:
        raise forbidden("Business not found")
    return TenantContext(user=user, business=business, role=member.role, staff_id=member.staff_id, db=db)


def require(permission: str):
    def dep(ctx: TenantContext = Depends(get_tenant)) -> TenantContext:
        if ctx.business.status == BusinessStatus.SUSPENDED:
            raise forbidden("This business is suspended. Contact Aqivo support.")
        if not ctx.can(permission):
            raise forbidden()
        return ctx

    return dep


def require_feature(feature: str, permission: str):
    def dep(ctx: TenantContext = Depends(require(permission)), db: Session = Depends(get_db)) -> TenantContext:
        if not has_feature(db, ctx.business, feature):
            raise upgrade_required(feature)
        return ctx

    return dep
