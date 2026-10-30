"""Pattern H: Singleton.
Thread-safe Singleton implementation using metaclasses with double-checked locking,
enforcing exactly one instance per worker process, with clear distinction across scopes.
"""
from __future__ import annotations

import threading
import time
from typing import Any


class SingletonMeta(type):
    """Thread-safe Singleton metaclass using double-checked locking."""

    _instances: dict[type, Any] = {}
    _lock: threading.Lock = threading.Lock()

    def __call__(cls, *args: Any, **kwargs: Any) -> Any:
        # First check (unlocked for speed)
        if cls not in cls._instances:
            with cls._lock:
                # Second check (locked for thread safety)
                if cls not in cls._instances:
                    instance = super().__call__(*args, **kwargs)
                    cls._instances[cls] = instance
        return cls._instances[cls]


class SystemMetricsCollector(metaclass=SingletonMeta):
    """Application-scoped telemetry collector singleton.

    Maintains in-memory counters and latency histograms across the worker process.
    Guarantees that multiple calls to SystemMetricsCollector() return the exact same object.
    """

    def __init__(self):
        self._counts: dict[str, int] = {}
        self._timings: dict[str, list[float]] = {}
        self._lock = threading.Lock()
        self.started_at = time.time()

    def increment(self, metric: str, value: int = 1) -> None:
        with self._lock:
            self._counts[metric] = self._counts.get(metric, 0) + value

    def record_timing(self, metric: str, duration_ms: float) -> None:
        with self._lock:
            self._timings.setdefault(metric, []).append(duration_ms)
            if len(self._timings[metric]) > 1000:
                self._timings[metric] = self._timings[metric][-500:]

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "uptime_seconds": time.time() - self.started_at,
                "counts": dict(self._counts),
                "averages": {
                    k: (sum(v) / len(v)) if v else 0.0
                    for k, v in self._timings.items()
                },
            }


class ApplicationRuntimeRegistry(metaclass=SingletonMeta):
    """Process-level registry for runtime flags, health status, and worker metadata."""

    def __init__(self):
        self._flags: dict[str, bool] = {"ready": True, "maintenance_mode": False}
        self._lock = threading.Lock()

    def set_flag(self, flag: str, value: bool) -> None:
        with self._lock:
            self._flags[flag] = value

    def get_flag(self, flag: str, default: bool = False) -> bool:
        with self._lock:
            return self._flags.get(flag, default)
