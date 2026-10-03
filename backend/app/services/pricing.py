"""Server-side cart pricing. The browser sends only *what* and *how many*; every price, fee, discount and tax is computed here from the database."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import bad_request
from app.models import Business, Product, ProductVariant, Service
from app.services import discounts as disc
from app.services import inventory as inv
from app.services import store as store_cfg

ZERO = Decimal("0")
MAX_LINES, MAX_QTY = 50, 99


@dataclass
class Line:
    kind: str
    qty: int
    name: str
    unit_price: Decimal
    image: str | None = None
    product: Product | None = None
    variant: ProductVariant | None = None
    service: Service | None = None
    variant_title: str | None = None
    compare_at: Decimal | None = None

    @property
    def total(self) -> Decimal:
        return (self.unit_price * self.qty).quantize(Decimal("0.01"))


@dataclass
class Quote:
    lines: list[Line]
    subtotal: Decimal
    discount: Decimal = ZERO
    discount_code: str | None = None
    discount_obj: object | None = None
    delivery_fee: Decimal = ZERO
    tax: Decimal = ZERO
    tax_inclusive: bool = True
    total: Decimal = ZERO
    currency: str = "KES"
    notes: list[str] = field(default_factory=list)


def _q(v: Decimal) -> Decimal:
    return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def resolve_lines(db: Session, business: Business, raw: list[dict], *, lock: bool = False) -> list[Line]:
    if not raw:
        raise bad_request("Your bag is empty")
    if len(raw) > MAX_LINES:
        raise bad_request("Too many different items in one order")
    # merge duplicates of the same product/variant
    merged: dict[tuple, int] = {}
    for r in raw:
        key = (r["kind"], uuid.UUID(str(r["id"])), uuid.UUID(str(r["variant_id"])) if r.get("variant_id") else None)
        merged[key] = merged.get(key, 0) + int(r["qty"])
    lines: list[Line] = []
    for (kind, ident, vid), qty in merged.items():
        if qty < 1 or qty > MAX_QTY:
            raise bad_request(f"Quantity must be between 1 and {MAX_QTY}")
        if kind == "service":
            sv = db.scalars(select(Service).where(Service.id == ident, Service.business_id == business.id, Service.deleted_at.is_(None), Service.is_active.is_(True))).first()
            if sv is None:
                raise bad_request("One of the items in your bag is no longer available")
            lines.append(Line("service", qty, sv.name, sv.price, sv.image_url, service=sv))
            continue
        q = select(Product).where(Product.id == ident, Product.business_id == business.id, Product.deleted_at.is_(None), Product.status == "ACTIVE")
        p = db.scalars(q.with_for_update() if lock else q).first()
        if p is None:
            raise bad_request("One of the items in your bag is no longer available")
        v = inv.must_get_variant(db, p, vid)
        if v is not None and lock:
            v = db.scalars(select(ProductVariant).where(ProductVariant.id == v.id).with_for_update()).one()
        have = inv.available_qty(p, v)
        title = f"{p.name}{' – ' + v.title if v else ''}"
        if have is not None and qty > have:
            raise bad_request(f"“{title}” is sold out" if have <= 0 else f"Only {have} of “{title}” left")
        price = v.price if v is not None and v.price is not None else p.price
        compare = (v.compare_at_price if v is not None and v.compare_at_price is not None else p.compare_at_price)
        img = (v.image_url if v and v.image_url else (p.images[0] if p.images else None))
        lines.append(Line("product", qty, p.name, price, img, product=p, variant=v, variant_title=v.title if v else None, compare_at=compare))
    return lines


def quote(db: Session, business: Business, raw_lines: list[dict], *, delivery_method: str = "PICKUP", zone: str | None = None, code: str | None = None,
          phone: str | None = None, lock: bool = False) -> Quote:
    cfg = store_cfg.get(business)
    if delivery_method not in ("PICKUP", "DELIVERY") or not cfg["fulfilment"][delivery_method.lower()]:
        raise bad_request("That delivery option isn't available")
    lines = resolve_lines(db, business, raw_lines, lock=lock)
    subtotal = _q(sum((ln.total for ln in lines), ZERO))
    if cfg["min_order"] and subtotal < Decimal(str(cfg["min_order"])):
        raise bad_request(f"The minimum order is {Decimal(str(cfg['min_order'])):,.0f} {business.currency}")
    qt = Quote(lines=lines, subtotal=subtotal, currency=business.currency, tax_inclusive=cfg["tax_inclusive"])

    d = None
    if code and code.strip():
        d = disc.find(db, business, code, lock=lock)
        disc.check(db, business, d, subtotal=subtotal, phone=phone)
        eligible = _q(sum((ln.total for ln in lines if ln.product is None or disc.applies_to(d, ln.product.id, ln.product.category_id)), ZERO))
        if d.type != "FREE_DELIVERY" and eligible <= 0:
            raise bad_request("That code doesn't apply to the items in your bag")
        qt.discount = disc.amount(d, eligible)
        qt.discount_code, qt.discount_obj = d.code, d

    after = subtotal - qt.discount
    if delivery_method == "DELIVERY":
        dl = cfg["delivery"]
        fee = Decimal(str(dl["flat_fee"]))
        if dl["zones"]:
            z = next((z for z in dl["zones"] if z["name"] == zone), None)
            if z is None:
                raise bad_request("Choose where we should deliver")
            fee = Decimal(str(z["fee"]))
        if dl["free_over"] is not None and after >= Decimal(str(dl["free_over"])):
            fee = ZERO
        if d is not None and d.type == "FREE_DELIVERY":
            fee = ZERO
        qt.delivery_fee = _q(fee)

    rate = Decimal(str(cfg["tax_rate"]))
    if rate > 0:
        qt.tax = _q(after * rate / (100 + rate)) if cfg["tax_inclusive"] else _q(after * rate / 100)
    qt.total = _q(after + qt.delivery_fee + (ZERO if cfg["tax_inclusive"] else qt.tax))
    return qt


def quote_json(qt: Quote) -> dict:
    return {
        "lines": [{"kind": ln.kind, "id": str((ln.product or ln.service).id), "variant_id": str(ln.variant.id) if ln.variant else None, "name": ln.name,
                   "variant_title": ln.variant_title, "image": ln.image, "qty": ln.qty, "unit_price": float(ln.unit_price), "line_total": float(ln.total)} for ln in qt.lines],
        "subtotal": float(qt.subtotal), "discount": float(qt.discount), "discount_code": qt.discount_code, "delivery_fee": float(qt.delivery_fee), "tax": float(qt.tax),
        "tax_inclusive": qt.tax_inclusive, "total": float(qt.total), "currency": qt.currency,
    }
