from fastapi import FastAPI

from app.api.routes import router


app = FastAPI(
    title="YouKnow API",
    version="0.1.0",
    description="Builds prerequisite-valid learning paths and daily study schedules.",
)
app.include_router(router)
