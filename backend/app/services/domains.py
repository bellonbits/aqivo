"""Custom domains. The owner proves ownership with a TXT record and points the domain at the platform; we check both with real DNS lookups.
HTTPS certificates are issued by the hosting/proxy layer (e.g. Caddy or Cloudflare on-demand TLS), not by this app — so the TLS status is
*observed* by connecting to the domain, never assumed."""
from __future__ import annotations

import re
import socket
import ssl
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import bad_request
from app.models import Business, Domain

_HOST = re.compile(r"^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$")
VERIFY_HOST = "_aqivo-verify"


def normalise(raw: str) -> str:
    d = (raw or "").strip().lower()
    d = re.sub(r"^https?://", "", d).split("/")[0].split(":")[0].rstrip(".")
    if not _HOST.match(d):
        raise bad_request("Enter a domain like www.yourshop.co.ke")
    base = get_settings().base_domain.lower()
    if d == base or d.endswith("." + base):
        raise bad_request(f"{base} addresses are already included — use your own domain here")
    if re.fullmatch(r"[\d.]+", d):
        raise bad_request("Use a domain name, not an IP address")
    return d


def is_apex(domain: str) -> bool:
    return domain.count(".") == 1 or domain.endswith((".co.ke", ".co.za", ".co.ug", ".co.tz", ".com.ng", ".com.gh")) and domain.count(".") == 2


def instructions(domain: str, token: str) -> dict:
    s = get_settings()
    ips = [i.strip() for i in s.custom_domain_ips.split(",") if i.strip()]
    apex = is_apex(domain)
    records = [{"type": "TXT", "host": f"{VERIFY_HOST}.{domain}", "value": token, "purpose": "Proves you own this domain"}]
    if apex and ips:
        records += [{"type": "A", "host": domain, "value": ip, "purpose": "Sends visitors to your storefront"} for ip in ips]
    else:
        records.append({"type": "CNAME", "host": domain, "value": s.custom_domain_cname, "purpose": "Sends visitors to your storefront"})
    note = ("Apex domains (yourshop.co.ke) need A records; if your DNS host supports ALIAS/ANAME you can use that with " + s.custom_domain_cname + " instead. We recommend using www.yourshop.co.ke as your main address.") if apex else ""
    return {"records": records, "note": note}


def _resolver():
    import dns.resolver
    r = dns.resolver.Resolver()
    r.lifetime = r.timeout = 4.0
    return r


def check_dns(domain: str, token: str) -> tuple[bool, bool | None, str | None]:
    """(txt_ok, routing_ok, error). routing_ok is None when we can't judge (no platform IPs configured and the domain is an apex)."""
    import dns.exception
    import dns.resolver
    s = get_settings()
    r = _resolver()
    txt_ok, err = False, None
    try:
        hosts_to_try = [f"{VERIFY_HOST}.{domain}", f"_bizora-verify.{domain}"]
        for h in hosts_to_try:
            try:
                for rr in r.resolve(h, "TXT"):
                    if token in "".join(x.decode() for x in rr.strings):
                        txt_ok = True
                        break
            except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
                continue
            if txt_ok:
                break
        if not txt_ok:
            err = f"We couldn't find the TXT record {VERIFY_HOST}.{domain} yet. DNS changes can take a few minutes to a few hours."
    except dns.exception.DNSException:
        err = "DNS lookup failed. Try again in a few minutes."
    routing: bool | None = None
    ips = {i.strip() for i in s.custom_domain_ips.split(",") if i.strip()}
    try:
        try:
            cn = [str(x.target).rstrip(".").lower() for x in r.resolve(domain, "CNAME")]
            routing = s.custom_domain_cname.lower() in cn
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            if ips:
                found = {str(x) for x in r.resolve(domain, "A")}
                routing = bool(found & ips)
    except dns.exception.DNSException:
        routing = False
    return txt_ok, routing, err


def check_tls(domain: str) -> tuple[bool, str | None]:
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=4) as sock, ctx.wrap_socket(sock, server_hostname=domain):
            return True, None
    except ssl.SSLCertVerificationError:
        return False, "The certificate for this domain isn't valid yet."
    except (OSError, ssl.SSLError):
        return False, "We couldn't open an HTTPS connection to this domain yet."


def run_checks(db: Session, d: Domain) -> Domain:
    txt_ok, routing, err = check_dns(d.domain, d.verification_token or "")
    d.last_checked_at = datetime.now(timezone.utc)
    if txt_ok:
        d.verification_status, d.status = "VERIFIED", "ACTIVE"
    else:
        d.verification_status, d.status = "PENDING", "PENDING"
    d.dns_ok = bool(routing)
    d.last_error = err
    if txt_ok and routing is False:
        d.last_error = "Ownership is confirmed, but the domain doesn't point at us yet. Add the CNAME/A record shown below."
    if d.verification_status == "VERIFIED":
        ok, terr = check_tls(d.domain)
        d.ssl_status = "ACTIVE" if ok else "PENDING"
        if not ok and not d.last_error:
            d.last_error = terr
    else:
        d.ssl_status = "NONE"
    if d.verification_status != "VERIFIED" and d.is_primary:
        d.is_primary = False
        biz = db.get(Business, d.business_id)
        if biz and biz.primary_domain == d.domain:
            biz.primary_domain = None
    _forget(d.domain)
    db.flush()
    return d


def _forget(host: str) -> None:
    from app.middleware import host_router
    host_router._cache.pop(host, None)


def set_primary(db: Session, business: Business, d: Domain | None) -> None:
    """Make one verified domain the main address. Visitors on every other address (and the aqivo.shop link) are redirected to it."""
    for x in db.scalars(select(Domain).where(Domain.business_id == business.id, Domain.type == "CUSTOM")):
        x.is_primary = False
    if d is None:
        business.primary_domain = None
    else:
        if d.verification_status != "VERIFIED":
            raise bad_request("Verify the domain before making it your main address")
        d.is_primary = True
        business.primary_domain = d.domain
    db.flush()
