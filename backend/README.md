# Metro Learning API

FastAPI service that normalizes learning sources, uses an LLM only to extract concepts and prerequisite proposals, then deterministically validates, orders, levels, and schedules the resulting graph.

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
```

`OPENAI_API_KEY` is also accepted. Without a key, development mode keeps the Quantum Computing fallback; production returns an explicit error.

## Sources

- `topic` and `text`: `POST /api/plans/generate`
- `youtube`: `POST /api/plans/generate` with a YouTube URL; the transcript is retrieved before analysis
- `pdf`: `POST /api/plans/generate-file` as multipart form data with `file` and a JSON `preferences` string

```bash
curl -X POST http://127.0.0.1:8000/api/plans/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "source": {"type": "topic", "value": "Quantum Computing"},
    "preferences": {"minutes_per_day": 30, "start_date": "2026-08-27"}
  }'
```

The LLM never receives scheduling instructions. It returns validated concepts and relationships; NetworkX and the scheduler remain deterministic Python code.
