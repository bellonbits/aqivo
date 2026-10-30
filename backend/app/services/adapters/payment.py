"""Pattern E: Adapter.
Translates heterogeneous third-party payment provider interfaces (Paystack, Flutterwave,
M-Pesa Daraja, Manual) into a unified application domain interface.
"""
from __future__ import annotations

import decimal
from dataclasses import dataclass
from typing import Any, Protocol

from app.services.gateways import (
    Daraja,
    Flutterwave,
    Gateway,
    GatewayError,
    InitResult,
    Paystack,
    VerifyResult,
    WebhookResult,
)

Mpesa = Daraja



class PaymentDomainException(Exception):
    """Domain-level payment exception."""


class ProviderUnavailableException(PaymentDomainException):
    """Raised when third-party provider experiences outage."""


class SignatureVerificationException(PaymentDomainException):
    """Raised when webhook signature fails validation."""


@dataclass(frozen=True)
class PaymentInitiationRequest:
    amount: decimal.Decimal
    currency: str
    reference: str
    customer_email: str | None = None
    customer_phone: str | None = None
    customer_name: str = ""
    callback_url: str = ""
    webhook_url: str = ""
    description: str = ""


class IPaymentAdapter(Protocol):
    """Common interface that all external payment gateways must conform to."""

    provider_id: str

    def initiate_transaction(
        self,
        config: dict[str, Any],
        secrets: dict[str, Any],
        request: PaymentInitiationRequest,
    ) -> InitResult: ...

    def verify_transaction(
        self,
        config: dict[str, Any],
        secrets: dict[str, Any],
        reference: str,
    ) -> VerifyResult: ...

    def process_webhook(
        self,
        config: dict[str, Any],
        secrets: dict[str, Any],
        headers: dict[str, str],
        body: bytes,
        query_params: dict[str, str],
    ) -> WebhookResult | None: ...


class BaseGatewayAdapter(IPaymentAdapter):
    """Generic adapter wrapping existing Gateway implementations."""

    def __init__(self, gateway: Gateway):
        self._gw = gateway
        self.provider_id = gateway.key

    def initiate_transaction(
        self,
        config: dict[str, Any],
        secrets: dict[str, Any],
        request: PaymentInitiationRequest,
    ) -> InitResult:
        try:
            return self._gw.init(
                config,
                secrets,
                amount=request.amount,
                currency=request.currency,
                reference=request.reference,
                email=request.customer_email,
                phone=request.customer_phone,
                name=request.customer_name,
                callback_url=request.callback_url,
                hook_url=request.webhook_url,
                description=request.description,
            )
        except GatewayError as e:
            raise ProviderUnavailableException(str(e)) from e

    def verify_transaction(
        self,
        config: dict[str, Any],
        secrets: dict[str, Any],
        reference: str,
    ) -> VerifyResult:
        try:
            return self._gw.verify(config, secrets, reference)
        except GatewayError as e:
            raise ProviderUnavailableException(str(e)) from e

    def process_webhook(
        self,
        config: dict[str, Any],
        secrets: dict[str, Any],
        headers: dict[str, str],
        body: bytes,
        query_params: dict[str, str],
    ) -> WebhookResult | None:
        try:
            return self._gw.parse_webhook(config, secrets, headers, body, query_params)
        except GatewayError as e:
            raise SignatureVerificationException(str(e)) from e


class PaystackAdapter(BaseGatewayAdapter):
    def __init__(self):
        super().__init__(Paystack())


class FlutterwaveAdapter(BaseGatewayAdapter):
    def __init__(self):
        super().__init__(Flutterwave())


class MpesaAdapter(BaseGatewayAdapter):
    def __init__(self):
        super().__init__(Mpesa())


class PaymentAdapterRegistry:
    """Registry managing and resolving payment adapters."""

    def __init__(self):
        self._adapters: dict[str, IPaymentAdapter] = {
            "paystack": PaystackAdapter(),
            "flutterwave": FlutterwaveAdapter(),
            "mpesa": MpesaAdapter(),
        }

    def get_adapter(self, provider_id: str) -> IPaymentAdapter:
        adapter = self._adapters.get(provider_id.lower())
        if not adapter:
            raise ValueError(f"No payment adapter registered for '{provider_id}'")
        return adapter


# Singleton registry instance
payment_adapters = PaymentAdapterRegistry()
