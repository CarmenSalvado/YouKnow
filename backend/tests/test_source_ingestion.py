import pytest

from app.services.source_ingestion import SourceIngestionError, extract_youtube_id, normalize_pdf


def test_youtube_url_variants_extract_the_same_id() -> None:
    video_id = "dQw4w9WgXcQ"
    assert extract_youtube_id(f"https://www.youtube.com/watch?v={video_id}") == video_id
    assert extract_youtube_id(f"https://youtu.be/{video_id}") == video_id
    assert extract_youtube_id(f"https://www.youtube.com/shorts/{video_id}") == video_id


def test_pdf_upload_validation_rejects_empty_content() -> None:
    with pytest.raises(SourceIngestionError, match="empty"):
        normalize_pdf(b"", "document.pdf", max_upload_bytes=1024)

