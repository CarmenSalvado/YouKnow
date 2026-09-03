from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app.api import routes
from app.config import Settings
from app.main import app
from app.services.plan_service import PlanService
from app.services.source_ingestion import SourceIngestionError, extract_youtube_id, normalize_pdf, normalize_youtube


def test_youtube_url_variants_extract_the_same_id() -> None:
    video_id = "dQw4w9WgXcQ"
    assert extract_youtube_id(f"https://www.youtube.com/watch?v={video_id}") == video_id
    assert extract_youtube_id(f"https://youtu.be/{video_id}") == video_id
    assert extract_youtube_id(f"https://www.youtube.com/shorts/{video_id}") == video_id


def test_pdf_upload_validation_rejects_empty_content() -> None:
    with pytest.raises(SourceIngestionError, match="empty"):
        normalize_pdf(b"", "document.pdf", max_upload_bytes=1024)


def test_short_ui_api_key_is_rejected() -> None:
    response = TestClient(app).post(
        "/api/plans/generate",
        headers={"X-LLM-API-Key": "short", "X-LLM-Provider": "qwen"},
        json={"title": "Roman history"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "API key must be between 10 and 256 characters."


def test_ui_cannot_turn_backend_into_an_api_proxy() -> None:
    response = TestClient(app).post(
        "/api/plans/generate",
        headers={"X-LLM-API-Key": "sk-test-key-long-enough", "X-LLM-Provider": "http://127.0.0.1"},
        json={"title": "Roman history"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Unsupported AI provider."


def test_ui_can_select_a_provider_model() -> None:
    service = routes.service_for("sk-test-key-long-enough", "qwen", "qwen-flash")

    assert service.analysis_service is not None
    assert service.analysis_service.llm.model == "qwen-flash"


def test_ui_rejects_an_invalid_model_id() -> None:
    response = TestClient(app).post(
        "/api/plans/generate",
        headers={"X-LLM-API-Key": "sk-test-key-long-enough", "X-LLM-Provider": "qwen", "X-LLM-Model": "qwen plus"},
        json={"title": "Roman history"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Invalid AI model ID."


def test_youtube_transcript_is_normalized(monkeypatch) -> None:
    fetched = [SimpleNamespace(text="Bees use waggle dances."), SimpleNamespace(text="Hives need careful management.")]
    fetched = type("Fetched", (list,), {"language": "English", "language_code": "en", "is_generated": False})(fetched)
    transcript = SimpleNamespace(fetch=lambda: fetched)
    transcripts = SimpleNamespace(find_transcript=lambda languages: transcript)
    monkeypatch.setattr("app.services.source_ingestion.YouTubeTranscriptApi", lambda: SimpleNamespace(list=lambda video_id: transcripts))

    source = normalize_youtube("https://youtu.be/dQw4w9WgXcQ")

    assert source.content == "Bees use waggle dances. Hives need careful management."
    assert source.metadata["language_code"] == "en"


def test_title_generates_a_route(monkeypatch) -> None:
    monkeypatch.setattr(routes, "plan_service", PlanService(Settings(app_env="development", llm_api_key=None, llm_model=None)))

    response = TestClient(app).post(
        "/api/plans/generate",
        json={"title": "Urban Beekeeping", "preferences": {"minutes_per_day": 30, "start_date": "2026-08-27"}},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Urban Beekeeping"

    legacy_response = TestClient(app).post(
        "/api/legacy/plans/generate",
        json={"source": {"type": "text", "value": "Fungi, spores, and hyphae."}},
    )
    assert legacy_response.status_code == 200

    old_contract_response = TestClient(app).post(
        "/api/plans/generate",
        json={"source": {"type": "topic", "value": "Urban Beekeeping"}},
    )
    assert old_contract_response.status_code == 422


def test_pdf_upload_generates_a_route(monkeypatch) -> None:
    writer = PdfWriter()
    page = writer.add_blank_page(300, 300)
    font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"), NameObject("/BaseFont"): NameObject("/Helvetica")})
    page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})})
    stream = DecodedStreamObject()
    stream.set_data(b"BT /F1 12 Tf 20 200 Td (Mycology fungi spores hyphae ecosystems) Tj ET")
    page[NameObject("/Contents")] = writer._add_object(stream)
    pdf = BytesIO()
    writer.write(pdf)
    monkeypatch.setattr(routes, "plan_service", PlanService(Settings(app_env="development", llm_api_key=None, llm_model=None)))

    response = TestClient(app).post(
        "/api/legacy/plans/generate-file",
        files={"file": ("mycology.pdf", pdf.getvalue(), "application/pdf")},
        data={"preferences": '{"minutes_per_day": 30, "start_date": "2026-08-27"}'},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "mycology"
    assert len(response.json()["concepts"]) == 12
