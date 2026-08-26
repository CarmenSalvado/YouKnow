from __future__ import annotations

from typing import Any, Protocol, TypeVar

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

