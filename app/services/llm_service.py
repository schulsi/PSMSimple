from __future__ import annotations

from ..config import Config
from dataclasses import dataclass
from openai import OpenAI, APIConnectionError, APIError, APITimeoutError, OpenAIError
import anthropic


class LLMError(Exception):
    pass


@dataclass
class LLMResponse:
    text: str
    model: str
    provider: str


def _call_anthropic(system: str, user: str, model: str, max_tokens: int) -> LLMResponse:
    try:

        client = anthropic.Anthropic(
            api_key=Config.ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return LLMResponse(
            text=msg.content[0].text,
            model=model,
            provider="anthropic",
        )
    except Exception as exc:
        raise LLMError(f"Anthropic Fehler: {exc}") from exc


def _call_openai(system: str, user: str, model: str, max_tokens: int) -> LLMResponse:
    try:

        client = OpenAI(api_key=Config.OPENAI_API_KEY, base_url=Config.OPENAI_BASE_URL, timeout=120)
        msg = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return LLMResponse(
            text=msg.choices[0].message.content,
            model=model,
            provider="openai",
        )
    except APITimeoutError as e:
        raise LLMError(f"LLM-Timeout bei Provider 'openai': {e}") from e
    except APIConnectionError as e:
        raise LLMError(f"LLM-Verbindung fehlgeschlagen: {e}") from e
    except APIError as e:
        raise LLMError(f"LLM-API-Fehler: {e}") from e
    except Exception as e:
        raise LLMError(f"Unerwarteter LLM-Fehler: {e}") from e
    except OpenAIError as exc:
        raise LLMError(f"OpenAI Fehler: {exc}") from exc


# Provider-Registry — einfach erweiterbar
_PROVIDERS = {
    "anthropic": _call_anthropic,
    "openai": _call_openai,
}

# Standardmodelle pro Provider
_DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
}


def llm_query(
    system: str,
    user: str,
    provider: str | None = None,
    model: str | None = None,
    max_tokens: int = 1024,
) -> LLMResponse:
    """
    Einheitlicher LLM-Aufruf, provider-agnostisch.

    Provider wird aus Umgebungsvariable LLM_PROVIDER gelesen (default: anthropic).
    Modell wird aus LLM_MODEL gelesen oder auf den Provider-Standard gesetzt.
    """
    provider = provider or Config.LLM_PROVIDER
    model = model or Config.LLM_MODEL or _DEFAULT_MODELS.get(provider)

    if not model:
        raise LLMError(f"Kein Modell für Provider '{provider}' konfiguriert")

    if provider not in _PROVIDERS:
        raise LLMError(
            f"Unbekannter Provider '{provider}'. Verfügbar: {list(_PROVIDERS)}")

    return _PROVIDERS[provider](system, user, model, max_tokens)
