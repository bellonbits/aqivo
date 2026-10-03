"""Upload pipeline: validate by actually decoding the image (not trusting Content-Type), strip EXIF,
cap dimensions, and emit web-optimised WebP variants. Storage is behind a tiny backend interface."""
import io
import uuid
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import get_settings
from app.core.errors import bad_request

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_PIXELS = 40_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
VARIANTS = {"thumb": 400, "medium": 900, "large": 1600}


class LocalStorage:
    def __init__(self, root: str):
        self.root = Path(root)

    def save(self, key: str, data: bytes) -> str:
        p = self.root / key
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        return f"/media/{key}"


def get_storage() -> LocalStorage:
    return LocalStorage(get_settings().media_dir)


async def process_upload(file: UploadFile, business_id: uuid.UUID, folder: str) -> dict:
    s = get_settings()
    raw = await file.read(s.max_upload_bytes + 1)
    if len(raw) > s.max_upload_bytes:
        raise bad_request(f"Image is too large (max {s.max_upload_bytes // 1024 // 1024}MB)")
    if not raw:
        raise bad_request("Empty file")
    try:
        img = Image.open(io.BytesIO(raw))
        fmt = img.format
        img.verify()
        img = Image.open(io.BytesIO(raw))
    except (UnidentifiedImageError, Exception):  # noqa: BLE001
        raise bad_request("That file isn't a valid image (JPEG, PNG or WebP)")
    if fmt not in ALLOWED_FORMATS:
        raise bad_request("Only JPEG, PNG or WebP images are allowed")
    img = ImageOps.exif_transpose(img)  # applies rotation then drops EXIF on re-encode
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "transparency" in img.info else "RGB")
    storage = get_storage()
    name = uuid.uuid4().hex
    urls: dict[str, str] = {}
    for label, width in VARIANTS.items():
        v = img.copy()
        v.thumbnail((width, width * 2))
        buf = io.BytesIO()
        v.save(buf, "WEBP", quality=82, method=4)
        urls[label] = storage.save(f"{business_id}/{folder}/{name}_{label}.webp", buf.getvalue())
    return {"url": urls["large"], "medium_url": urls["medium"], "thumb_url": urls["thumb"],
            "width": img.width, "height": img.height, "bytes": len(raw)}
