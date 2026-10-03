"""Dashboard APIs for variants, inventory, orders, discounts and store settings."""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import TenantContext, require
from app.api.helpers import log
from app.core.countries import normalize_phone
from app.core.db import get_db
from app.core.errors import bad_request, not_found, or404
from app.models import Discount, InventoryMovement, Order, Payment, Product, ProductVariant
from app.repositories.base import TenantRepository
from app.schemas.common import Page
from app.schemas.commerce import (AdjustIn, DeliveryIn, DiscountIn, DiscountOut, DiscountUpdate, ManualOrderIn, MovementOut, NoteIn, OptionsIn, OrderOut, PaidIn, RefundIn, StatusIn, VariantOut,
                                  VariantUpdate)
from app.services import discounts as disc
from app.services import inventory as inv
from app.services import orders as order_svc
from app.services import store as store_cfg
from app.services.website import touch_draft

variants_router = APIRouter(prefix="/products", tags=["variants"])
inventory_router = APIRouter(prefix="/inventory", tags=["inventory"])
orders_router = APIRouter(prefix="/orders", tags=["orders"])
discounts_router = APIRouter(prefix="/discounts", tags=["discounts"])
store_router = APIRouter(prefix="/store", tags=["store"])


def _dirty(ctx: TenantContext) -> None:
    if ctx.business.website:
        touch_draft(ctx.business.website)


def _product(db: Session, ctx: TenantContext, pid: uuid.UUID) -> Product:
    return or404(db.scalars(select(Product).where(Product.id == pid, Product.business_id == ctx.business_id, Product.deleted_at.is_(None))).first(), "Product")


# ------------------------------------------------------------------ variants
@variants_router.get("/{product_id}/variants", response_model=list[VariantOut])
def list_variants(product_id: uuid.UUID, ctx: TenantContext = Depends(require("products:read")), db: Session = Depends(get_db)):
    p = _product(db, ctx, product_id)
    return inv.active_variants(db, p)


@variants_router.put("/{product_id}/options", response_model=list[VariantOut])
def set_options(product_id: uuid.UUID, body: OptionsIn, request: Request, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    """Define options (Size, Colour…). Variants are generated from every combination; existing ones keep their stock and price."""
    p = _product(db, ctx, product_id)
    opts = inv.parse_options([o.model_dump() for o in body.options])
    total = 1
    for o in opts:
        total *= len(o["values"])
    if total > 100:
        raise bad_request("That makes more than 100 variants. Use fewer options or values.")
    inv.sync_variants(db, p, opts)
    _dirty(ctx)
    log(ctx, "product.options_set", request, "product", p.id)
    db.commit()
    return inv.active_variants(db, p)


@variants_router.patch("/{product_id}/variants/{variant_id}", response_model=VariantOut)
def update_variant(product_id: uuid.UUID, variant_id: uuid.UUID, body: VariantUpdate, request: Request, ctx: TenantContext = Depends(require("products:write")), db: Session = Depends(get_db)):
    p = _product(db, ctx, product_id)
    v = or404(db.scalars(select(ProductVariant).where(ProductVariant.id == variant_id, ProductVariant.product_id == p.id, ProductVariant.business_id == ctx.business_id)).first(), "Variant")
    data = body.model_dump(exclude_unset=True)
    if "stock_qty" in data and data["stock_qty"] is not None and p.track_stock and data["stock_qty"] != v.stock_qty:
        inv.adjust_stock(db, p, v, data["stock_qty"] - v.stock_qty, "ADJUSTMENT", note="Edited in product", user_id=ctx.user.id)
    elif "stock_qty" in data and data["stock_qty"] is not None:
        v.stock_qty = data["stock_qty"]
    if data.pop("clear_price", False):
        v.price = None
    for k in ("sku", "price", "compare_at_price", "image_url", "is_active"):
        if k in data:
            setattr(v, k, data[k])
    _dirty(ctx)
    db.commit()
    return v


# ------------------------------------------------------------------ inventory
@inventory_router.get("")
def stock_levels(view: str = Query("all", pattern="^(all|low|out)$"), q: str | None = None, limit: int = Query(100, ge=1, le=300), offset: int = Query(0, ge=0),
                 ctx: TenantContext = Depends(require("products:read")), db: Session = Depends(get_db)):
    """One row per sellable stock holder: the product itself, or each variant of a product that has variants."""
    products = list(db.scalars(select(Product).where(Product.business_id == ctx.business_id, Product.deleted_at.is_(None), Product.track_stock.is_(True),
                                                     *([Product.name.ilike(f"%{q.strip()}%")] if q else [])).order_by(Product.name)))
    rows = []
    for p in products:
        vs = inv.active_variants(db, p)
        if vs:
            rows += [{"product_id": str(p.id), "variant_id": str(v.id), "name": p.name, "variant": v.title, "sku": v.sku or p.sku, "stock": v.stock_qty, "threshold": p.low_stock_threshold,
                      "image": v.image_url or (p.images[0] if p.images else None), "status": p.status} for v in vs]
        else:
            rows.append({"product_id": str(p.id), "variant_id": None, "name": p.name, "variant": None, "sku": p.sku, "stock": p.stock_qty, "threshold": p.low_stock_threshold,
                         "image": p.images[0] if p.images else None, "status": p.status})
    out_n = sum(1 for r in rows if r["stock"] <= 0)
    low_n = sum(1 for r in rows if 0 < r["stock"] <= r["threshold"])
    if view == "out":
        rows = [r for r in rows if r["stock"] <= 0]
    elif view == "low":
        rows = [r for r in rows if 0 < r["stock"] <= r["threshold"]]
    return {"items": rows[offset: offset + limit], "total": len(rows), "limit": limit, "offset": offset, "counts": {"out": out_n, "low": low_n}}


@inventory_router.post("/adjust")
def adjust(body: AdjustIn, request: Request, ctx: TenantContext = Depends(require("inventory:write")), db: Session = Depends(get_db)):
    p = _product(db, ctx, body.product_id)
    if not p.track_stock:
        raise bad_request("Turn on ‘Track stock’ for this product first")
    v = None
    if body.variant_id:
        v = or404(db.scalars(select(ProductVariant).where(ProductVariant.id == body.variant_id, ProductVariant.product_id == p.id, ProductVariant.business_id == ctx.business_id)).first(), "Variant")
    elif inv.active_variants(db, p):
        raise bad_request("Choose which variant to adjust")
    cur = v.stock_qty if v else p.stock_qty
    if (body.delta is None) == (body.set_to is None):
        raise bad_request("Give either a change (+/-) or a new total")
    delta = body.delta if body.delta is not None else body.set_to - cur  # type: ignore[operator]
    if delta == 0:
        return {"stock": cur}
    new = inv.adjust_stock(db, p, v, delta, body.reason, note=body.note, user_id=ctx.user.id)
    _dirty(ctx)
    log(ctx, "inventory.adjusted", request, "product", p.id, delta=delta)
    db.commit()
    return {"stock": new}


@inventory_router.get("/movements", response_model=Page[MovementOut])
def movements(product_id: uuid.UUID | None = None, limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
              ctx: TenantContext = Depends(require("products:read")), db: Session = Depends(get_db)):
    where = [InventoryMovement.business_id == ctx.business_id] + ([InventoryMovement.product_id == product_id] if product_id else [])
    total = db.scalar(select(func.count()).select_from(InventoryMovement).where(*where)) or 0
    items = db.scalars(select(InventoryMovement).where(*where).order_by(InventoryMovement.created_at.desc()).limit(limit).offset(offset)).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


# ------------------------------------------------------------------ orders
def _order_out(db: Session, o: Order) -> dict:
    out = OrderOut.model_validate(o).model_dump()
    pay = db.scalars(select(Payment).where(Payment.order_id == o.id, Payment.business_id == o.business_id)).first()
    out["payment_reference"] = o.payment_reference or (pay.provider_reference if pay else None)
    return out


def _get_order(db: Session, ctx: TenantContext, oid: uuid.UUID) -> Order:
    return or404(db.scalars(select(Order).where(Order.id == oid, Order.business_id == ctx.business_id)).first(), "Order")


@orders_router.get("")
def list_orders(status: str | None = None, payment_status: str | None = None, q: str | None = None, limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
                ctx: TenantContext = Depends(require("orders:read")), db: Session = Depends(get_db)):
    where = [Order.business_id == ctx.business_id]
    if status:
        where.append(Order.status == status.upper())
    if payment_status:
        where.append(Order.payment_status == payment_status.upper())
    if q:
        like = f"%{q.strip()}%"
        digits = q.strip().lstrip("#")
        where.append(or_(Order.customer_name.ilike(like), Order.customer_phone.ilike(like), *( [Order.number == int(digits)] if digits.isdigit() else [] )))
    total = db.scalar(select(func.count()).select_from(Order).where(*where)) or 0
    rows = db.scalars(select(Order).where(*where).order_by(Order.created_at.desc()).limit(limit).offset(offset)).all()
    counts = dict(db.execute(select(Order.status, func.count()).where(Order.business_id == ctx.business_id).group_by(Order.status)).all())
    return {"items": [_order_out(db, o) for o in rows], "total": total, "limit": limit, "offset": offset, "counts": counts}


@orders_router.get("/summary")
def orders_summary(ctx: TenantContext = Depends(require("orders:read")), db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=30)
    base = [Order.business_id == ctx.business_id, Order.created_at >= since, Order.status.notin_(("CANCELLED", "REFUNDED"))]
    count = db.scalar(select(func.count()).select_from(Order).where(*base)) or 0
    revenue = db.scalar(select(func.coalesce(func.sum(Order.total), 0)).where(*base, Order.payment_status == "PAID")) or Decimal("0")
    pending = db.scalar(select(func.count()).select_from(Order).where(Order.business_id == ctx.business_id, Order.status == "PENDING")) or 0
    return {"orders_30d": count, "paid_revenue_30d": float(revenue), "pending": pending, "currency": ctx.business.currency}


@orders_router.get("/{oid}")
def get_order(oid: uuid.UUID, ctx: TenantContext = Depends(require("orders:read")), db: Session = Depends(get_db)):
    return _order_out(db, _get_order(db, ctx, oid))


@orders_router.post("", status_code=201)
def create_manual_order(body: ManualOrderIn, request: Request, ctx: TenantContext = Depends(require("orders:write")), db: Session = Depends(get_db)):
    """The owner records an order taken by phone or WhatsApp. Same pricing, stock and discount rules as the website."""
    phone = None
    if body.phone:
        try:
            phone = normalize_phone(body.phone, ctx.business.country_code)
        except ValueError as e:
            raise bad_request(str(e))
    cfg_keys = {m["key"] for m in store_cfg.enabled_payments(ctx.business, db) if not m.get("gateway")} | {"cash"}  # an owner may always take cash
    if body.payment not in cfg_keys:
        raise bad_request("That payment option is turned off")
    store_cfg.get(ctx.business)  # ensure defaults exist
    o = order_svc.place(db, ctx.business, raw_lines=[{"kind": ln.kind, "id": str(ln.id), "variant_id": str(ln.variant_id) if ln.variant_id else None, "qty": ln.qty} for ln in body.lines],
                        name=body.name.strip(), phone=phone, email=body.email, delivery_method=body.delivery_method, zone=body.zone, address=body.address, notes=body.notes, scheduled_for=body.scheduled_for,
                        payment_key=body.payment, code=body.code, channel=body.channel)
    log(ctx, "order.created", request, "order", o.id, number=o.number)
    db.commit()
    return _order_out(db, o)


@orders_router.patch("/{oid}/status")
def change_status(oid: uuid.UUID, body: StatusIn, request: Request, ctx: TenantContext = Depends(require("orders:write")), db: Session = Depends(get_db)):
    o = _get_order(db, ctx, oid)
    order_svc.set_status(db, o, body.status.upper(), actor=ctx.user.id, note=body.note)
    log(ctx, "order.status", request, "order", o.id, status=o.status)
    db.commit()
    return _order_out(db, o)


@orders_router.patch("/{oid}/delivery")
def set_delivery(oid: uuid.UUID, body: DeliveryIn, request: Request, ctx: TenantContext = Depends(require("orders:write")), db: Session = Depends(get_db)):
    """Record who is delivering and an optional tracking link; the customer sees it on their order page and is told on WhatsApp if connected."""
    o = _get_order(db, ctx, oid)
    if o.status in ("CANCELLED", "REFUNDED"):
        raise bad_request("This order is closed")
    url = (body.tracking_url or "").strip()
    if url and not url.startswith("https://"):
        raise bad_request("The tracking link must start with https://")
    name, phone = (body.courier_name or "").strip() or None, (body.courier_phone or "").strip() or None
    changed = (name, phone, url or None) != (o.courier_name, o.courier_phone, o.tracking_url)
    o.courier_name, o.courier_phone, o.tracking_url = name, phone, url or None
    if changed and (name or url):
        order_svc.add_note(o, f"Delivery: {name or 'courier'} assigned." + (" Tracking link added." if url else ""), ctx.user.id)
        order_svc._event(o, "STATUS", f"Out for delivery with {name}." if name else "Tracking link added.", status=o.status)
        from app.services import whatsapp
        from app.services.business import business_urls
        whatsapp.notify_order(db, o, f"on its way{' with ' + name if name else ''}", f"{business_urls(ctx.business)['profile']}/order/{o.token}")
    log(ctx, "order.delivery", request, "order", o.id)
    db.commit()
    return _order_out(db, o)


@orders_router.post("/{oid}/payment")
def record_payment(oid: uuid.UUID, body: PaidIn, request: Request, ctx: TenantContext = Depends(require("orders:write")), db: Session = Depends(get_db)):
    o = _get_order(db, ctx, oid)
    order_svc.mark_paid(db, o, actor=ctx.user.id, reference=body.reference)
    log(ctx, "order.paid", request, "order", o.id)
    db.commit()
    return _order_out(db, o)


@orders_router.post("/{oid}/refund")
def refund_order(oid: uuid.UUID, body: RefundIn, request: Request, ctx: TenantContext = Depends(require("orders:write")), db: Session = Depends(get_db)):
    o = _get_order(db, ctx, oid)
    order_svc.refund(db, o, actor=ctx.user.id, restock_items=body.restock, note=body.note)
    log(ctx, "order.refunded", request, "order", o.id)
    db.commit()
    return _order_out(db, o)


@orders_router.post("/{oid}/note")
def add_note(oid: uuid.UUID, body: NoteIn, ctx: TenantContext = Depends(require("orders:write")), db: Session = Depends(get_db)):
    o = _get_order(db, ctx, oid)
    order_svc.add_note(o, body.message, ctx.user.id)
    db.commit()
    return _order_out(db, o)


# ------------------------------------------------------------------ discounts
class DiscountRepository(TenantRepository[Discount]):
    model = Discount


@discounts_router.get("", response_model=list[DiscountOut])
def list_discounts(ctx: TenantContext = Depends(require("discounts:read")), db: Session = Depends(get_db)):
    return db.scalars(select(Discount).where(Discount.business_id == ctx.business_id).order_by(Discount.created_at.desc())).all()


def _check_discount(body, db: Session, ctx: TenantContext, typ: str | None, value) -> None:
    if typ == "PERCENT" and value is not None and not (0 < value <= 100):
        raise bad_request("A percentage discount must be between 1 and 100")
    if typ == "FIXED" and value is not None and value <= 0:
        raise bad_request("Enter the amount to take off")
    for pid in getattr(body, "product_ids", None) or []:
        if not db.scalar(select(Product.id).where(Product.id == pid, Product.business_id == ctx.business_id)):
            raise bad_request("One of the chosen products doesn't exist")
    if getattr(body, "starts_at", None) and getattr(body, "ends_at", None) and body.ends_at <= body.starts_at:
        raise bad_request("The end date must be after the start date")


@discounts_router.post("", response_model=DiscountOut, status_code=201)
def create_discount(body: DiscountIn, request: Request, ctx: TenantContext = Depends(require("discounts:write")), db: Session = Depends(get_db)):
    _check_discount(body, db, ctx, body.type, body.value)
    if disc.find(db, ctx.business, body.code):
        raise bad_request("You already have a code with that name")
    data = body.model_dump()
    data["product_ids"] = [str(x) for x in body.product_ids]
    data["category_ids"] = [str(x) for x in body.category_ids]
    d = DiscountRepository(db, ctx.business_id).add(**data)
    log(ctx, "discount.created", request, "discount", d.id)
    db.commit()
    return d


@discounts_router.patch("/{did}", response_model=DiscountOut)
def update_discount(did: uuid.UUID, body: DiscountUpdate, ctx: TenantContext = Depends(require("discounts:write")), db: Session = Depends(get_db)):
    repo = DiscountRepository(db, ctx.business_id)
    d = or404(repo.get(did), "Discount")
    data = body.model_dump(exclude_unset=True)
    _check_discount(body, db, ctx, data.get("type", d.type), data.get("value", d.value))
    for k in ("product_ids", "category_ids"):
        if k in data and data[k] is not None:
            data[k] = [str(x) for x in data[k]]
    repo.update(d, **data)
    db.commit()
    return d


@discounts_router.delete("/{did}", status_code=204)
def delete_discount(did: uuid.UUID, ctx: TenantContext = Depends(require("discounts:write")), db: Session = Depends(get_db)):
    repo = DiscountRepository(db, ctx.business_id)
    repo.delete(or404(repo.get(did), "Discount"))  # past orders keep the code text
    db.commit()


# ------------------------------------------------------------------ store settings
class StoreIn(BaseModel):
    settings: dict


@store_router.get("/settings")
def get_store_settings(ctx: TenantContext = Depends(require("store:read")), db: Session = Depends(get_db)):
    from app.services import connections as cx
    gateways = [{"key": k, "label": cx.PROVIDERS[k]["label"], "connected": cx.connected(db, ctx.business, k)} for k in (*store_cfg.ONLINE_GATEWAYS, "daraja")]
    wa = cx.connected(db, ctx.business, "whatsapp_cloud")
    return {"settings": store_cfg.get(ctx.business), "payment_options": [{"key": k, "label": v["label"]} for k, v in store_cfg.PAYMENT_METHODS.items()],
            "gateways": gateways, "whatsapp_connected": wa, "online_gateway": store_cfg.online_gateway(db, ctx.business),
            "online_providers": [{"name": n, "connected": False} for n in store_cfg.ONLINE_PROVIDERS], "currency": ctx.business.currency}


@store_router.patch("/settings")
def update_store_settings(body: StoreIn, request: Request, ctx: TenantContext = Depends(require("store:write")), db: Session = Depends(get_db)):
    out = store_cfg.update(ctx.business, body.settings)
    log(ctx, "store.settings_updated", request, "business", ctx.business.id)
    db.commit()
    return {"settings": out}
