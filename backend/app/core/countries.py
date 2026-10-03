"""Country configuration. Nothing in the core system hardcodes Kenya — everything
locale-dependent (currency, phone formatting, payment providers, tax) resolves here."""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Country:
    code: str
    name: str
    currency: str
    dial_code: str
    locale: str
    timezone: str
    payment_providers: tuple[str, ...] = ("MANUAL",)
    tax_name: str = "VAT"
    tax_rate: str = "0.16"
    national_number_lengths: tuple[int, ...] = (9,)
    address_format: tuple[str, ...] = ("address", "city", "country")


COUNTRIES: dict[str, Country] = {
    c.code: c
    for c in [
        Country("KE", "Kenya", "KES", "254", "en-KE", "Africa/Nairobi", ("MPESA", "MANUAL"), "VAT", "0.16"),
        Country("TZ", "Tanzania", "TZS", "255", "en-TZ", "Africa/Dar_es_Salaam", ("MANUAL",), "VAT", "0.18"),
        Country("UG", "Uganda", "UGX", "256", "en-UG", "Africa/Kampala", ("MANUAL",), "VAT", "0.18"),
        Country("NG", "Nigeria", "NGN", "234", "en-NG", "Africa/Lagos", ("MANUAL",), "VAT", "0.075", (10,)),
        Country("RW", "Rwanda", "RWF", "250", "en-RW", "Africa/Kigali", ("MANUAL",), "VAT", "0.18"),
        Country("ET", "Ethiopia", "ETB", "251", "en-ET", "Africa/Addis_Ababa", ("MANUAL",), "VAT", "0.15"),
        Country("ZA", "South Africa", "ZAR", "27", "en-ZA", "Africa/Johannesburg", ("MANUAL",), "VAT", "0.15"),
        Country("SO", "Somalia", "USD", "252", "so-SO", "Africa/Mogadishu", ("MANUAL",), "VAT", "0"),
    ]
}

SUPPORTED_CURRENCIES = ("KES", "USD", "TZS", "UGX", "NGN", "RWF", "ETB", "ZAR")
SUPPORTED_LOCALES = ("en", "sw", "so", "fr", "ar", "am")
DEFAULT_COUNTRY = "KE"


def get_country(code: str | None) -> Country:
    return COUNTRIES.get((code or DEFAULT_COUNTRY).upper(), COUNTRIES[DEFAULT_COUNTRY])


def normalize_phone(raw: str, country_code: str | None = None) -> str:
    """Return E.164-ish digits with '+' prefix. Raises ValueError if implausible."""
    c = get_country(country_code)
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        raise ValueError("Phone number is required")
    if raw.strip().startswith("+") or digits.startswith(c.dial_code) and len(digits) > max(c.national_number_lengths) + 1:
        if digits.startswith(c.dial_code):
            national = digits[len(c.dial_code):]
            ok = len(national) in c.national_number_lengths
        else:
            ok = 8 <= len(digits) <= 15
            national = digits
        if not ok:
            raise ValueError("Enter a valid phone number")
        return "+" + digits
    if digits.startswith("00"):
        digits = digits[2:]
        if 8 <= len(digits) <= 15:
            return "+" + digits
    if digits.startswith("0"):
        digits = digits[1:]
    if len(digits) not in c.national_number_lengths:
        raise ValueError("Enter a valid phone number")
    return "+" + c.dial_code + digits
