from fastapi import HTTPException, status


def not_found(what: str = "Resource") -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} not found")


def forbidden(msg: str = "You don't have permission to do that") -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, msg)


def bad_request(msg: str) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, msg)


def conflict(msg: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, msg)


def upgrade_required(feature: str, message: str | None = None) -> HTTPException:
    return HTTPException(status.HTTP_402_PAYMENT_REQUIRED, {"code": "upgrade_required", "feature": feature,
                                                             "message": message or "Upgrade your plan to use this feature"})


def or404(obj, what: str = "Resource"):
    if obj is None:
        raise not_found(what)
    return obj
