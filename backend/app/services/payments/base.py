"""Provider-independent payment interface. Concrete providers plug in without touching business logic."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal


@dataclass
class ProviderResult:
    ok: bool
    status: str  # PENDING | PAID | FAILED
    reference: str | None = None
    message: str = ""
    raw: dict = field(default_factory=dict)


@dataclass
class WebhookEventData:
    event_id: str
    reference: str | None
    status: str  # PAID | FAILED | CANCELLED
    amount: Decimal | None
    raw: dict


class PaymentProvider(ABC):
    name: str

    @abstractmethod
    def is_configured(self) -> bool: ...

    @abstractmethod
    def initiate(self, *, amount: Decimal, currency: str, phone: str | None, reference: str, description: str) -> ProviderResult: ...

    def verify_webhook(self, headers: dict, body: bytes, query: dict) -> bool:
        return False

    def parse_webhook(self, payload: dict) -> WebhookEventData | None:
        return None


_REGISTRY: dict[str, PaymentProvider] = {}


def register(provider: PaymentProvider) -> None:
    _REGISTRY[provider.name] = provider


def get_provider(name: str) -> PaymentProvider | None:
    _load()
    return _REGISTRY.get(name)


def available_providers() -> list[dict]:
    _load()
    return [{"name": p.name, "configured": p.is_configured()} for p in _REGISTRY.values()]


def _load() -> None:
    if _REGISTRY:
        return
    from app.services.payments.mpesa import MpesaProvider
    register(MpesaProvider())
