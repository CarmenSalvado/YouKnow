# YouKnow — How to learn better

![YouKnow demo](./gifs/landing.gif)

YouKnow turns an overwhelming subject into a route you can actually follow.
Choose a topic, paste a source, or upload a PDF. YouKnow finds the concepts
that matter, connects their prerequisites, and schedules the next lesson around
the time you have.

## Why it works

- **See the whole journey.** A visual learning map shows foundations, core ideas,
  advanced topics, and applications in context.
- **Start at the right place.** Concept dependencies make prerequisites visible,
  so you do not have to guess what to learn first.
- **Fit learning into real life.** Set minutes per day and an optional target
  date; your route is scheduled into focused sessions.
- **Keep everything attached to the idea.** Track progress, write notes, and
  pin books, links, videos, or files to individual concepts.
- **Go deeper only when needed.** Expand a stop to add the missing track behind
  it, or ask the AI Coach what to do next.

## Run it locally

Requirements: Node.js, Python, and [`uv`](https://docs.astral.sh/uv/).

```bash
npm install
npm run dev
```

This starts the Vite frontend and the FastAPI backend together. Open the URL
printed by Vite (usually `http://localhost:5173`).

To run them separately:

```bash
# Frontend
npx vite --host 0.0.0.0

# API
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

The API docs are available at `http://127.0.0.1:8000/docs`.

## Learning sources

The planner accepts:

- a topic or free-form text;
- a YouTube URL (transcript is retrieved before analysis);
- a PDF upload.

The backend uses an LLM to extract concepts and prerequisite proposals, then
validates, orders, and schedules the graph deterministically. Without a cloud
key, it can use a local Ollama model; if no model is available, it still returns
a structural route.

Optional environment variables for the backend:

```bash
export LLM_API_KEY=your_openai_key
export LLM_MODEL=gpt-5-mini
# Or use a local Ollama model:
export OLLAMA_MODEL=qwen2.5:7b
export OLLAMA_BASE_URL=http://127.0.0.1:11434
```

`OPENAI_API_KEY` is accepted as an alternative to `LLM_API_KEY`.

## Checks

```bash
npm run build
npm run check:ui
npm run check:map
npm run check:e2e

cd backend
uv run pytest
```

## Project shape

```text
src/       React dashboard, learning map, landing page, and map gallery
backend/   FastAPI routes, source ingestion, graph building, and scheduling
gifs/      README demos
```

## License

No license has been specified yet.
