"""Stock rules. A product tracks stock only when `track_stock` is on. If it has active variants, each variant holds its own stock;
otherwise the product does. Every change is written to the movement ledger."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import bad_request
from app.models import InventoryMovement, Product, ProductVariant


def active_variants(db: Session, product: Product) -> list[ProductVariant]:
    return list(db.scalars(select(ProductVariant).where(ProductVariant.product_id == product.id, ProductVariant.business_id == product.business_id,
                                                        ProductVariant.is_active.is_(True)).order_by(ProductVariant.position, ProductVariant.created_at)))


def available_qty(product: Product, variant: ProductVariant | None) -> int | None:
    """None = untracked (unlimited)."""
    if not product.track_stock:
        return None
    return variant.stock_qty if variant is not None else product.stock_qty


def adjust_stock(db: Session, product: Product, variant: ProductVariant | None, delta: int, reason: str, *, note: str = "", order_id=None, user_id=None,
                 allow_negative: bool = False) -> int | None:
    """Apply a stock change and log it. No-op for untracked products. Returns the new quantity."""
    if not product.track_stock:
        return None
    holder = variant if variant is not None else product
    new = holder.stock_qty + delta  # type: ignore[attr-defined]
    if new < 0 and not allow_negative:
        raise bad_request(f"Only {holder.stock_qty} of “{product.name}{' – ' + variant.title if variant else ''}” left")  # type: ignore[attr-defined]
    holder.stock_qty = new  # type: ignore[attr-defined]
    db.add(InventoryMovement(business_id=product.business_id, product_id=product.id, variant_id=variant.id if variant else None,
                             product_name=f"{product.name}{' – ' + variant.title if variant else ''}"[:200], delta=delta, qty_after=new, reason=reason,
                             note=note[:200], order_id=order_id, created_by=user_id))
    db.flush()
    return new


def product_total_stock(db: Session, product: Product) -> int | None:
    if not product.track_stock:
        return None
    vs = active_variants(db, product)
    return sum(v.stock_qty for v in vs) if vs else product.stock_qty


def parse_options(options: list) -> list[dict]:
    """Validate [{name, values}] — up to 3 options, 40 values each."""
    out = []
    for o in (options or [])[:3]:
        name = str(o.get("name", "")).strip()[:30]
        vals = []
        for v in o.get("values", [])[:40]:
            v = str(v).strip()[:30]
            if v and v not in vals:
                vals.append(v)
        if name and vals:
            out.append({"name": name, "values": vals})
    if len({o["name"].lower() for o in out}) != len(out):
        raise bad_request("Option names must be different")
    return out


def combinations(options: list[dict]) -> list[dict]:
    combos: list[dict] = [{}]
    for o in options:
        combos = [{**c, o["name"]: v} for c in combos for v in o["values"]]
    return combos if options else []


def variant_title(opts: dict) -> str:
    return " / ".join(str(v) for v in opts.values())


def sync_variants(db: Session, product: Product, options: list[dict]) -> list[ProductVariant]:
    """Make the variant rows match the option grid: add missing combinations, deactivate ones that no longer exist. Existing rows keep their stock/price."""
    options = parse_options(options)
    product.options = options
    existing = {v.title: v for v in db.scalars(select(ProductVariant).where(ProductVariant.product_id == product.id, ProductVariant.business_id == product.business_id))}
    wanted = combinations(options)
    keep = set()
    for i, opts in enumerate(wanted):
        t = variant_title(opts)
        keep.add(t)
        v = existing.get(t)
        if v is None:
            v = ProductVariant(business_id=product.business_id, product_id=product.id, title=t, options=opts, position=i, is_active=True, stock_qty=0)
            db.add(v)
        else:
            v.options, v.position, v.is_active = opts, i, True
    for t, v in existing.items():
        if t not in keep:
            v.is_active = False
    db.flush()
    return list(db.scalars(select(ProductVariant).where(ProductVariant.product_id == product.id, ProductVariant.business_id == product.business_id)
                           .order_by(ProductVariant.position, ProductVariant.created_at)))


def must_get_variant(db: Session, product: Product, variant_id: uuid.UUID | None) -> ProductVariant | None:
    vs = active_variants(db, product)
    if not vs:
        return None
    if variant_id is None:
        raise bad_request(f"Choose an option for “{product.name}”")
    v = next((x for x in vs if x.id == variant_id), None)
    if v is None:
        raise bad_request(f"That option of “{product.name}” isn't available")
    return v
