"""Granular permissions. The `roles` table is seeded from DEFAULT_ROLE_PERMISSIONS at startup;
the in-memory map is the enforcement source so a request never costs an extra query."""
from app.models.enums import BusinessRole

ALL = "*"

OWNER_ONLY = {"subscription:manage", "members:manage", "business:delete", "payments:write"}

_MANAGER = {
    "business:read", "services:read", "services:write", "gallery:write", "customers:read", "customers:write",
    "leads:read", "leads:write", "bookings:read", "bookings:write", "reviews:read", "reviews:respond",
    "analytics:read", "staff:read", "staff:write", "website:read", "website:write", "payments:read", "invoices:read",
    "invoices:write", "marketing:read", "marketing:write", "ai:use",
    "products:read", "products:write", "orders:read", "orders:write", "discounts:read", "discounts:write", "inventory:write", "store:read", "store:write",
}
# Admin = manager plus the owner-level settings that don't touch billing or deleting the business.
_ADMIN = _MANAGER | {"members:manage", "payments:write"}
_SALES = {"business:read", "orders:read", "orders:write", "customers:read", "customers:write", "leads:read", "leads:write", "bookings:read", "bookings:write",
          "products:read", "services:read", "discounts:read", "reviews:read", "payments:read"}
_EDITOR = {"business:read", "website:read", "website:write", "products:read", "products:write", "services:read", "services:write", "gallery:write", "reviews:read"}
_STAFF = {"business:read", "services:read", "products:read", "bookings:read", "bookings:write", "customers:read", "reviews:read", "orders:read"}

DEFAULT_ROLE_PERMISSIONS: dict[str, set[str]] = {
    BusinessRole.BUSINESS_OWNER: {ALL},
    BusinessRole.BUSINESS_ADMIN: _ADMIN,
    BusinessRole.BUSINESS_MANAGER: _MANAGER,
    BusinessRole.SALES: _SALES,
    BusinessRole.EDITOR: _EDITOR,
    BusinessRole.STAFF: _STAFF,
}

ROLE_LABELS = {
    "BUSINESS_OWNER": "Owner", "BUSINESS_ADMIN": "Admin", "BUSINESS_MANAGER": "Manager", "SALES": "Sales", "EDITOR": "Editor", "STAFF": "Staff",
}

# Roles that only see bookings/customers tied to their own staff profile.
ASSIGNED_ONLY_ROLES = {BusinessRole.STAFF}


def role_has(role: str, permission: str) -> bool:
    perms = DEFAULT_ROLE_PERMISSIONS.get(role, set())
    return ALL in perms or permission in perms
