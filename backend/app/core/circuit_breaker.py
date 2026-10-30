"""Pattern D: Circuit Breaker.
State machine (CLOSED, OPEN, HALF_OPEN) protecting against cascading failures
when interacting with external services (SMS, Payment Gateways, Social APIs, AI).
"""
from __future__ import annotations

import enum
import functools
import logging
import threading
import time
from typing import Any, Callable, TypeVar

log = logging.getLogger("bizora.circuit_breaker")

T = TypeVar("T")


class CircuitState(str, enum.Enum):
    CLOSED = "CLOSED"          # Normal operation: requests pass through
    OPEN = "OPEN"              # Service degraded: fail fast without calling provider
    HALF_OPEN = "HALF_OPEN"    # Testing recovery: trial probe calls permitted


class CircuitBreakerOpenException(Exception):
    """Raised when an operation is attempted while the circuit is OPEN."""

    def __init__(self, service_name: str, retry_after: float):
        super().__init__(f"Circuit breaker for '{service_name}' is OPEN. Retry after {retry_after:.1f}s.")
        self.service_name = service_name
        self.retry_after = retry_after


class CircuitBreaker:
    """Production-grade, thread-safe Circuit Breaker state machine."""

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        reset_interval: float = 30.0,
        half_open_success_threshold: int = 2,
        monitored_exceptions: tuple[type[Exception], ...] = (Exception,),
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.reset_interval = reset_interval
        self.half_open_success_threshold = half_open_success_threshold
        self.monitored_exceptions = monitored_exceptions

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_state_change = time.monotonic()
        self._lock = threading.RLock()

    @property
    def state(self) -> CircuitState:
        with self._lock:
            if self._state == CircuitState.OPEN:
                elapsed = time.monotonic() - self._last_state_change
                if elapsed >= self.reset_interval:
                    self._transition_to(CircuitState.HALF_OPEN)
            return self._state

    def _transition_to(self, new_state: CircuitState) -> None:
        log.warning(
            "CircuitBreaker [%s] transitioned from %s to %s",
            self.name,
            self._state.value,
            new_state.value,
        )
        self._state = new_state
        self._last_state_change = time.monotonic()
        if new_state == CircuitState.HALF_OPEN:
            self._success_count = 0
        elif new_state == CircuitState.CLOSED:
            self._failure_count = 0
            self._success_count = 0

    def call(self, func: Callable[..., T], *args: Any, fallback: Callable[..., T] | None = None, **kwargs: Any) -> T:
        """Executes func protected by the circuit breaker, with optional fallback."""
        current_state = self.state

        if current_state == CircuitState.OPEN:
            remaining = max(0.0, self.reset_interval - (time.monotonic() - self._last_state_change))
            if fallback is not None:
                log.info("CircuitBreaker [%s] is OPEN. Invoking fallback.", self.name)
                return fallback(*args, **kwargs)
            raise CircuitBreakerOpenException(self.name, remaining)

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.monitored_exceptions as exc:
            self._on_failure(exc)
            if fallback is not None:
                log.warning("CircuitBreaker [%s] caught failure. Falling back.", self.name)
                return fallback(*args, **kwargs)
            raise

    def _on_success(self) -> None:
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.half_open_success_threshold:
                    self._transition_to(CircuitState.CLOSED)
            elif self._state == CircuitState.CLOSED:
                self._failure_count = 0

    def _on_failure(self, exc: Exception) -> None:
        with self._lock:
            self._failure_count += 1
            log.warning(
                "CircuitBreaker [%s] recorded failure %d/%d: %s",
                self.name,
                self._failure_count,
                self.failure_threshold,
                exc,
            )
            if self._state in (CircuitState.CLOSED, CircuitState.HALF_OPEN):
                if self._failure_count >= self.failure_threshold or self._state == CircuitState.HALF_OPEN:
                    self._transition_to(CircuitState.OPEN)


# Registry of circuit breakers by service name
_CIRCUITS: dict[str, CircuitBreaker] = {}
_REGISTRY_LOCK = threading.Lock()


def get_circuit_breaker(name: str, **kwargs: Any) -> CircuitBreaker:
    with _REGISTRY_LOCK:
        if name not in _CIRCUITS:
            _CIRCUITS[name] = CircuitBreaker(name=name, **kwargs)
        return _CIRCUITS[name]


def circuit_breaker(name: str, fallback: Callable | None = None, **cb_kwargs: Any):
    """Decorator to wrap function calls in a Circuit Breaker."""
    cb = get_circuit_breaker(name, **cb_kwargs)

    def decorator(fn: Callable):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return cb.call(fn, *args, fallback=fallback, **kwargs)
        return wrapper
    return decorator
