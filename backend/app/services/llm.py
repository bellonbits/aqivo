"""Unified LLM service for Aqivo.
Supports Groq (OpenAI-compatible ultra-fast inference) as primary provider,
with Anthropic Claude as fallback or alternative.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from app.core.config import get_settings

log = logging.getLogger("bizora.llm")


def call_llm(system: str, prompt: str, max_tokens: int = 500) -> str | None:
    """Execute text generation against the configured LLM provider."""
    s = get_settings()

    # 1. Groq (Ultra-fast, Llama/GPT-OSS models)
    if s.groq_api_key:
        try:
            model = s.groq_model or "openai/gpt-oss-120b"
            r = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                timeout=30,
                headers={
                    "Authorization": f"Bearer {s.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": max_tokens,
                },
            )
            r.raise_for_status()
            choice = r.json()["choices"][0]["message"]
            content = choice.get("content")
            if content and str(content).strip():
                return str(content).strip()
        except Exception as exc:  # noqa: BLE001
            log.warning("groq text completion failed", extra={"error": str(exc)})

    # 2. Anthropic (Claude)
    if s.anthropic_api_key:
        try:
            r = httpx.post(
                "https://api.anthropic.com/v1/messages",
                timeout=30,
                headers={
                    "x-api-key": s.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": max_tokens,
                    "system": system,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            r.raise_for_status()
            return r.json()["content"][0]["text"].strip()
        except Exception as exc:  # noqa: BLE001
            log.warning("anthropic text completion failed", extra={"error": str(exc)})

    return None


def call_llm_json(system: str, prompt: str, max_tokens: int = 2500) -> dict[str, Any] | None:
    """Execute structured JSON generation against the configured LLM provider."""
    s = get_settings()

    # 1. Groq (Native JSON mode)
    if s.groq_api_key:
        try:
            model = s.groq_model or "openai/gpt-oss-120b"
            r = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                timeout=40,
                headers={
                    "Authorization": f"Bearer {s.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "max_tokens": max_tokens,
                },
            )
            r.raise_for_status()
            choice = r.json()["choices"][0]["message"]
            txt = choice.get("content") or ""
            m = re.search(r"\{.*\}", txt, re.S)
            if m:
                return json.loads(m.group(0))
        except Exception as exc:  # noqa: BLE001
            log.warning("groq json completion failed", extra={"error": str(exc)})

    # 2. Anthropic
    if s.anthropic_api_key:
        try:
            r = httpx.post(
                "https://api.anthropic.com/v1/messages",
                timeout=40,
                headers={
                    "x-api-key": s.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": max_tokens,
                    "system": system,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            r.raise_for_status()
            txt = r.json()["content"][0]["text"]
            m = re.search(r"\{.*\}", txt, re.S)
            if m:
                return json.loads(m.group(0))
        except Exception as exc:  # noqa: BLE001
            log.warning("anthropic json completion failed", extra={"error": str(exc)})

    return None
