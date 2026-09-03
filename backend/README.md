# YouKnow API

FastAPI service that turns a learning title into a prerequisite-valid map and daily study schedule.

## Run

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for the generated API documentation.

## Test

```bash
cd backend
uv run pytest
```

## Environment

```bash
export APP_ENV=development
export LLM_API_KEY=your_openai_key
export LLM_MODEL=gpt-5-mini
# Optional OpenAI-compatible endpoint:
export LLM_BASE_URL=
# Optional local model (used automatically when no cloud key is set):
export OLLAMA_MODEL=qwen2.5:7b
export OLLAMA_BASE_URL=http://127.0.0.1:11434
```

`OPENAI_API_KEY` is also accepted. Without a cloud key, the API uses local Ollama to choose the necessary 4–25 concepts and prerequisites. If neither model is available, it still returns a 12-stop structural route instead of breaking. Quantum Computing keeps its richer curated fallback.

## Generate a route

The current endpoint accepts only the title of what the user wants to learn:

```bash
curl -X POST http://127.0.0.1:8000/api/plans/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Quantum Computing",
    "preferences": {"minutes_per_day": 30, "start_date": "2026-08-27"}
  }'
```

The LLM never receives scheduling instructions. It returns validated concepts and relationships; NetworkX and the scheduler remain deterministic Python code.

## Legacy source ingestion

The planned text, YouTube, and PDF inputs remain available for future work:

- topic, text, or YouTube: `POST /api/legacy/plans/generate`
- PDF: `POST /api/legacy/plans/generate-file`

These endpoints are deprecated and are not used by the current interface.
