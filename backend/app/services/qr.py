import io

import segno


def qr_bytes(url: str, fmt: str = "png", scale: int = 12, dark: str = "#0F0F0F") -> tuple[bytes, str]:
    q = segno.make(url, error="m")
    buf = io.BytesIO()
    if fmt == "svg":
        q.save(buf, kind="svg", scale=scale, dark=dark, border=2, xmldecl=False)
        return buf.getvalue(), "image/svg+xml"
    q.save(buf, kind="png", scale=scale, dark=dark, border=2)
    return buf.getvalue(), "image/png"


def poster_pdf(business_name: str, headline: str, url: str, accent: str = "#0F0F0F") -> bytes:
    """A print-ready A4 poster: big headline, the QR code, the address."""
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    png, _ = qr_bytes(url, "png", scale=14, dark="#0F0F0F")
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    try:
        col = HexColor(accent)
    except Exception:  # noqa: BLE001
        col = HexColor("#0F0F0F")
    c.setFillColor(col)
    c.rect(0, h - 120, w, 120, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(w / 2, h - 75, business_name[:40])
    c.setFillColor(HexColor("#0F0F0F"))
    c.setFont("Helvetica-Bold", 44)
    c.drawCentredString(w / 2, h - 230, (headline or "Scan to visit us")[:28])
    size = 330
    c.drawImage(ImageReader(io.BytesIO(png)), (w - size) / 2, h - 230 - 60 - size, size, size)
    c.setFont("Helvetica", 15)
    c.setFillColor(HexColor("#444444"))
    c.drawCentredString(w / 2, 150, "Point your phone camera at the code")
    c.setFont("Helvetica", 11)
    c.drawCentredString(w / 2, 125, url.split("?")[0])
    c.setFont("Helvetica", 9)
    c.setFillColor(HexColor("#888888"))
    c.drawCentredString(w / 2, 50, "Made with Aqivo.shop")
    c.showPage()
    c.save()
    return buf.getvalue()
