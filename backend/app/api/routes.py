import asyncio
import re

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from pydantic import ValidationError

from app.config import Settings
from app.models import ExpandLineRequest, GeneratePlanRequest, LineExpansionResponse, PlanResponse, RequiredPathRequest, RequiredPathResponse, SourceInput, SourceType, StudyPreferences, TitlePlanRequest
from app.services.llm import CompatibleLLMClient, LLMClientError
from app.services.plan_service import PlanAnalysisError, PlanGenerationUnavailable, PlanService
from app.services.source_ingestion import SourceIngestionError, normalize_pdf


router = APIRouter()
settings = Settings.from_env()
plan_service = PlanService(settings)
providers = {
    "openai": ("gpt-5-mini", None),
    "qwen": ("qwen-plus", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
    "groq": ("openai/gpt-oss-20b", "https://api.groq.com/openai/v1"),
    "gemini": ("gemini-3.7-flash", "https://generativelanguage.googleapis.com/v1beta/openai/"),
    "openrouter": ("openrouter/free", "https://openrouter.ai/api/v1"),
}


def service_for(api_key: str | None, provider: str | None, model: str | None = None) -> PlanService:
    if not api_key:
        return plan_service
    key = api_key.strip()
    if not 10 <= len(key) <= 256:
        raise HTTPException(status_code=422, detail="API key must be between 10 and 256 characters.")
    if provider not in providers:
        raise HTTPException(status_code=422, detail="Unsupported AI provider.")
    default_model, base_url = providers[provider]
    selected_model = (model or default_model).strip()
    if not re.fullmatch(r"[A-Za-z0-9._:/-]{1,100}", selected_model):
        raise HTTPException(status_code=422, detail="Invalid AI model ID.")
    return PlanService(
        settings,
        CompatibleLLMClient(api_key=key, model=selected_model, base_url=base_url),
        fallback_on_llm_error=False,
    )


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/api/plans/generate", response_model=PlanResponse)
async def generate_plan(request: TitlePlanRequest, api_key: str | None = Header(default=None, alias="X-LLM-API-Key", max_length=256), provider: str | None = Header(default="openai", alias="X-LLM-Provider"), model: str | None = Header(default=None, alias="X-LLM-Model", max_length=100)) -> PlanResponse:
    try:
        legacy_request = GeneratePlanRequest(source=SourceInput(type=SourceType.TOPIC, value=request.title), preferences=request.preferences)
        return await service_for(api_key, provider, model).generate(legacy_request)
    except SourceIngestionError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except PlanGenerationUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (PlanAnalysisError, LLMClientError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/api/plans/expand", response_model=LineExpansionResponse)
async def expand_line(request: ExpandLineRequest, api_key: str | None = Header(default=None, alias="X-LLM-API-Key", max_length=256), provider: str | None = Header(default="openai", alias="X-LLM-Provider"), model: str | None = Header(default=None, alias="X-LLM-Model", max_length=100)) -> LineExpansionResponse:
    try:
        return await service_for(api_key, provider, model).expand(request)
    except (PlanAnalysisError, LLMClientError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/api/plans/required-path", response_model=RequiredPathResponse)
async def required_path(request: RequiredPathRequest, api_key: str | None = Header(default=None, alias="X-LLM-API-Key", max_length=256), provider: str | None = Header(default="openai", alias="X-LLM-Provider"), model: str | None = Header(default=None, alias="X-LLM-Model", max_length=100)) -> RequiredPathResponse:
    try:
        return await service_for(api_key, provider, model).required_path(request)
    except (PlanAnalysisError, LLMClientError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/api/legacy/plans/generate", response_model=PlanResponse, deprecated=True)
async def generate_plan_legacy(request: GeneratePlanRequest, api_key: str | None = Header(default=None, alias="X-LLM-API-Key", max_length=256), provider: str | None = Header(default="openai", alias="X-LLM-Provider"), model: str | None = Header(default=None, alias="X-LLM-Model", max_length=100)) -> PlanResponse:
    try:
        return await service_for(api_key, provider, model).generate(request)
    except SourceIngestionError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except PlanGenerationUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (PlanAnalysisError, LLMClientError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/api/legacy/plans/generate-file", response_model=PlanResponse, deprecated=True)
async def generate_plan_file(
    file: UploadFile = File(...),
    preferences: str = Form("{}"),
    api_key: str | None = Header(default=None, alias="X-LLM-API-Key", max_length=256),
    provider: str | None = Header(default="openai", alias="X-LLM-Provider"),
    model: str | None = Header(default=None, alias="X-LLM-Model", max_length=100),
) -> PlanResponse:
    try:
        study_preferences = StudyPreferences.model_validate_json(preferences)
        data = await file.read(settings.max_upload_bytes + 1)
        source = await asyncio.to_thread(
            normalize_pdf,
            data,
            file.filename or "document.pdf",
            max_upload_bytes=settings.max_upload_bytes,
        )
        return await service_for(api_key, provider, model).generate_normalized(source, study_preferences)
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=f"invalid preferences: {error}") from error
    except SourceIngestionError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except PlanGenerationUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (PlanAnalysisError, LLMClientError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
