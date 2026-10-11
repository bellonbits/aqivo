"""CLI utility to create or reset an admin user account.
Usage:
    python -m app.manage_admin [email] [password] [full_name]

Examples:
    python -m app.manage_admin admin@bizora.co admin-password-1 "Super Admin"
    docker compose exec backend python -m app.manage_admin admin@bizora.co admin-password-1
"""
import os
import sys

from sqlalchemy import select

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import User
from app.models.enums import PlatformRole


def main():
    email = sys.argv[1] if len(sys.argv) > 1 else os.getenv("ADMIN_EMAIL", "admin@bizora.co")
    password = sys.argv[2] if len(sys.argv) > 2 else os.getenv("ADMIN_PASSWORD", "admin-password-1")
    full_name = sys.argv[3] if len(sys.argv) > 3 else os.getenv("ADMIN_NAME", "Aqivo Super Admin")

    email = email.strip().lower()
    if not email or not password:
        print("Error: Both email and password must be provided.")
        sys.exit(1)

    with SessionLocal() as db:
        user = db.scalars(select(User).where(User.email == email)).first()
        if user:
            user.password_hash = hash_password(password)
            user.platform_role = PlatformRole.SUPER_ADMIN
            user.is_active = True
            user.email_verified = True
            user.failed_logins = 0
            user.locked_until = None
            user.deleted_at = None
            if full_name:
                user.full_name = full_name
            db.commit()
            print(f"SUCCESS: Existing user '{email}' password updated and granted SUPER_ADMIN privileges!")
        else:
            new_user = User(
                email=email,
                password_hash=hash_password(password),
                full_name=full_name,
                platform_role=PlatformRole.SUPER_ADMIN,
                is_active=True,
                email_verified=True,
                failed_logins=0,
                locked_until=None
            )
            db.add(new_user)
            db.commit()
            print(f"SUCCESS: New admin user '{email}' created with SUPER_ADMIN privileges!")

        # Self-verification check simulating /api/v1/auth/login
        from app.core.security import verify_password
        chk = db.scalars(select(User).where(User.email == email, User.deleted_at.is_(None))).first()
        if not chk or not chk.is_active or not verify_password(password, chk.password_hash):
            print("ERROR: Self-verification test failed!")
            sys.exit(1)

        print("\n-------------------------------------------")
        print(f"Email:    {email}")
        print(f"Password: {password}")
        print(f"Role:     SUPER_ADMIN")
        print("Status:   ACTIVE & VERIFIED")
        print("Self-test: Auth verification PASSED")
        print("-------------------------------------------\n")


if __name__ == "__main__":
    main()
