from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    app_env: str
    llm_api_key: str | None
    llm_model: str | None
    llm_base_url: str | None = None
    ollama_model: str | None = None
    ollama_base_url: str = "http://127.0.0.1:11434"
    max_source_chars: int = 80_000
    max_upload_bytes: int = 15 * 1024 * 1024

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            app_env=os.getenv("APP_ENV", "development").lower(),
            llm_api_key=os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY"),
            llm_model=os.getenv("LLM_MODEL") or "gpt-5-mini",
            llm_base_url=os.getenv("LLM_BASE_URL"),
            ollama_model=os.getenv("OLLAMA_MODEL", "qwen2.5:7b"),
            ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
            max_source_chars=int(os.getenv("MAX_SOURCE_CHARS", "80000")),
            max_upload_bytes=int(os.getenv("MAX_UPLOAD_BYTES", str(15 * 1024 * 1024))),
        )

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"
