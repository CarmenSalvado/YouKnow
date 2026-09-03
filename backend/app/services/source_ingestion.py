from io import BytesIO
from pathlib import Path
import re
from urllib.parse import parse_qs, urlparse

from pypdf import PdfReader
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import NoTranscriptFound

from app.models import NormalizedSource, SourceInput, SourceType


class SourceIngestionError(ValueError):
    pass


def normalize_source(source: SourceInput) -> NormalizedSource:
    if source.type is SourceType.TOPIC:
        return NormalizedSource(
            source_type=source.type,
            title=source.value,
            content=source.value,
            metadata={},
        )
    if source.type is SourceType.TEXT:
        title = next((line.strip() for line in source.value.splitlines() if line.strip()), "Pasted text")
        return NormalizedSource(
            source_type=source.type,
            title=title[:120],
            content=source.value,
            metadata={"character_count": len(source.value)},
        )
    if source.type is SourceType.YOUTUBE:
        return normalize_youtube(source.value)
    if source.type is SourceType.PDF:
        raise SourceIngestionError("PDF sources must use /api/legacy/plans/generate-file")
    raise SourceIngestionError(f"unsupported source type: {source.type.value}")


def normalize_pdf(data: bytes, filename: str, *, max_upload_bytes: int) -> NormalizedSource:
    if not filename.lower().endswith(".pdf"):
        raise SourceIngestionError("uploaded document must be a PDF")
    if not data:
        raise SourceIngestionError("uploaded PDF is empty")
    if len(data) > max_upload_bytes:
        raise SourceIngestionError(f"uploaded PDF exceeds the {max_upload_bytes}-byte limit")
    try:
        reader = PdfReader(BytesIO(data))
        if len(reader.pages) > 500:
            raise SourceIngestionError("PDF exceeds the 500-page MVP limit")
        text = "\n\n".join(filter(None, (page.extract_text() for page in reader.pages))).strip()
    except SourceIngestionError:
        raise
    except Exception as error:
        raise SourceIngestionError("could not read the uploaded PDF") from error
    if not text:
        raise SourceIngestionError("PDF contains no extractable text; scanned PDFs require OCR")

    metadata_title = reader.metadata.title if reader.metadata and reader.metadata.title else None
    return NormalizedSource(
        source_type=SourceType.PDF,
        title=metadata_title or Path(filename).stem,
        content=text,
        metadata={"filename": filename, "page_count": len(reader.pages)},
    )


def extract_youtube_id(url: str) -> str:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host in {"youtu.be", "www.youtu.be"}:
        video_id = parsed.path.strip("/").split("/")[0]
    elif host == "youtube.com" or host.endswith(".youtube.com"):
        if parsed.path == "/watch":
            video_id = parse_qs(parsed.query).get("v", [""])[0]
        else:
            parts = parsed.path.strip("/").split("/")
            video_id = parts[1] if len(parts) == 2 and parts[0] in {"embed", "shorts", "live"} else ""
    else:
        video_id = ""
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise SourceIngestionError("invalid YouTube URL")
    return video_id


def normalize_youtube(url: str) -> NormalizedSource:
    video_id = extract_youtube_id(url)
    try:
        api = YouTubeTranscriptApi()
        transcripts = api.list(video_id)
        try:
            transcript = transcripts.find_transcript(["en", "es"])
        except NoTranscriptFound:
            transcript = next(iter(transcripts))
        fetched = transcript.fetch()
    except Exception as error:
        raise SourceIngestionError("YouTube transcript is unavailable") from error
    content = " ".join(snippet.text for snippet in fetched).strip()
    if not content:
        raise SourceIngestionError("YouTube transcript is empty")
    return NormalizedSource(
        source_type=SourceType.YOUTUBE,
        title=f"YouTube video {video_id}",
        content=content,
        metadata={
            "url": url,
            "video_id": video_id,
            "language": fetched.language,
            "language_code": fetched.language_code,
            "is_generated": fetched.is_generated,
        },
    )
