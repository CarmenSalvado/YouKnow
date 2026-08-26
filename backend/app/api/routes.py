import asyncio

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import ValidationError

from app.config import Settings
from app.models import GeneratePlanRequest, PlanResponse, StudyPreferences
from app.services.llm import LLMClientError
from app.services.plan_service import PlanAnalysisError, PlanGenerationUnavailable, PlanService
from app.services.source_ingestion import SourceIngestionError, normalize_pdf


router = APIRouter()
settings = Settings.from_env()
plan_service = PlanService(settings)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/api/plans/generate", response_model=PlanResponse)
async def generate_plan(request: GeneratePlanRequest) -> PlanResponse:
    try:
        return await plan_service.generate(request)
    except SourceIngestionError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except PlanGenerationUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (PlanAnalysisError, LLMClientError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/api/plans/generate-file", response_model=PlanResponse)
async def generate_plan_file(
    file: UploadFile = File(...),
    preferences: str = Form("{}"),
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
        return await plan_service.generate_normalized(source, study_preferences)
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=f"invalid preferences: {error}") from error
    except SourceIngestionError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except PlanGenerationUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (PlanAnalysisError, LLMClientError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
