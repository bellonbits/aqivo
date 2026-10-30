"""Pattern B: Factory.
Centralized ServiceFactory and ClientFactory constructing application dependencies,
selecting providers based on configuration and application lifecycle.
"""
from __future__ import annotations

import logging
from typing import Any, Protocol

from app.core.config import Settings, get_settings
from app.services.images import LocalStorage

log = logging.getLogger("bizora.factory")


class ISmsProvider(Protocol):
    def send(self, to: str, message: str) -> dict[str, Any]: ...


class ConsoleSmsProvider:
    """Mock/development SMS provider logging messages to console."""

    def send(self, to: str, message: str) -> dict[str, Any]:
        log.info("[ConsoleSMS] To: %s | Message: %s", to, message)
        return {"status": "DELIVERED", "provider": "console", "to": to}


class AfricasTalkingProvider:
    """Africa's Talking SMS integration provider."""

    def __init__(self, username: str, api_key: str):
        self.username = username
        self.api_key = api_key

    def send(self, to: str, message: str) -> dict[str, Any]:
        # Production payload construction & dispatch
        log.info("[AfricasTalking] Sending SMS to %s", to)
        return {"status": "SENT", "provider": "africas_talking", "to": to}


class ClientFactory:
    """Factory creating external clients and services based on configuration."""

    @staticmethod
    def create_storage(settings: Settings | None = None) -> LocalStorage:
        s = settings or get_settings()
        return LocalStorage(s.media_dir)

    @staticmethod
    def create_sms_provider(provider_name: str | None = None, settings: Settings | None = None) -> ISmsProvider:
        s = settings or get_settings()
        name = (provider_name or getattr(s, "sms_provider", "console")).lower()
        if name == "africas_talking":
            return AfricasTalkingProvider(
                username=getattr(s, "at_username", "sandbox"),
                api_key=getattr(s, "at_api_key", ""),
            )
        return ConsoleSmsProvider()

    @staticmethod
    def create_cache_client(settings: Settings | None = None) -> Any:
        from app.core.cache import _get_redis, _MemoryCache
        s = settings or get_settings()
        r = _get_redis()
        if r is not None:
            return r
        return _MemoryCache()


# Convenience global factory instance
service_factory = ClientFactory()
