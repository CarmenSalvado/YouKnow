from __future__ import annotations

import asyncio
import json
from typing import Any, Protocol, TypeVar
from urllib.error import URLError
from urllib.request import Request, urlopen

from openai import APIError, AsyncOpenAI
from pydantic import BaseModel, ValidationError


StructuredModel = TypeVar("StructuredModel", bound=BaseModel)


class LLMClientError(RuntimeError):
    pass


class LLMClient(Protocol):
    async def structured_completion(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[StructuredModel],
    ) -> StructuredModel: ...


class OpenAILLMClient:
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        base_url: str | None = None,
        client: Any | None = None,
    ) -> None:
        self.model = model
        self.client = client or AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def structured_completion(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[StructuredModel],
    ) -> StructuredModel:
        prompt = user_prompt
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                response = await self.client.responses.parse(
                    model=self.model,
                    input=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    text_format=response_model,
                )
                if response.output_parsed is None:
                    raise ValueError("the model returned no structured output")
                return response_model.model_validate(response.output_parsed)
            except (ValidationError, TypeError, ValueError) as error:
                last_error = error
                if attempt == 0:
                    prompt = (
                        f"{user_prompt}\n\nThe previous response failed schema validation: {error}. "
                        "Return a corrected response matching the schema exactly."
                    )
            except APIError as error:
                raise LLMClientError(f"LLM request failed: {type(error).__name__}") from error
        raise LLMClientError(f"LLM structured output remained invalid after one retry: {last_error}")


class CompatibleLLMClient:
    def __init__(self, *, api_key: str, model: str, base_url: str | None, client: Any | None = None) -> None:
        self.model = model
        self.client = client or AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def structured_completion(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[StructuredModel],
    ) -> StructuredModel:
        schema = json.dumps(response_model.model_json_schema(), separators=(",", ":"))
        prompt = user_prompt
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": f"{system_prompt}\nReturn only JSON matching this schema: {schema}"},
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                )
                return response_model.model_validate_json(response.choices[0].message.content)
            except (IndexError, ValidationError, TypeError, ValueError) as error:
                last_error = error
                if attempt == 0:
                    prompt = f"{user_prompt}\n\nThe previous response was invalid: {error}. Return only valid JSON matching the schema."
            except APIError as error:
                raise LLMClientError(f"LLM request failed: {type(error).__name__}") from error
        raise LLMClientError(f"LLM structured output remained invalid after one retry: {last_error}")


class OllamaLLMClient:
    def __init__(self, *, model: str, base_url: str = "http://127.0.0.1:11434") -> None:
        self.model = model
        self.url = f"{base_url.rstrip('/')}/api/chat"

    def _post(self, payload: bytes) -> dict[str, Any]:
        with urlopen(Request(self.url, data=payload, headers={"Content-Type": "application/json"}), timeout=120) as response:
            return json.loads(response.read())

    async def structured_completion(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[StructuredModel],
    ) -> StructuredModel:
        prompt = user_prompt
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                payload = json.dumps({
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    "stream": False,
                    "think": False,
                    "format": response_model.model_json_schema(),
                    "options": {"temperature": 0, "num_predict": 4096},
                }).encode()
                content = (await asyncio.to_thread(self._post, payload))["message"]["content"]
                return response_model.model_validate_json(content)
            except (URLError, TimeoutError, OSError) as error:
                raise LLMClientError(f"Ollama request failed: {type(error).__name__}") from error
            except (KeyError, TypeError, ValueError, ValidationError) as error:
                last_error = error
                if attempt == 0:
                    prompt = f"{user_prompt}\n\nYour previous response was invalid: {error}. Return only valid JSON matching the schema."
        raise LLMClientError(f"Ollama structured output remained invalid after one retry: {last_error}")
