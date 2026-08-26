from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Any, Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator


ConceptId = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_]*$")]


class SourceType(StrEnum):
    TOPIC = "topic"
    TEXT = "text"
    PDF = "pdf"
    YOUTUBE = "youtube"


class ConceptCategory(StrEnum):
    FOUNDATION = "foundation"
    CORE = "core"
    ADVANCED = "advanced"
    APPLICATION = "application"


class SourceInput(BaseModel):
    type: SourceType
    value: str = Field(min_length=1)

    @field_validator("value")
    @classmethod
    def strip_value(cls, value: str) -> str:
        if not (value := value.strip()):
            raise ValueError("source value cannot be blank")
        return value


class NormalizedSource(BaseModel):
    source_type: SourceType
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class Concept(BaseModel):
    id: ConceptId
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    difficulty: int = Field(ge=1, le=5)
    estimated_minutes: int = Field(gt=0)
    category: ConceptCategory
    source_evidence: str = Field(min_length=1)
    external_prerequisite: bool = False
    level: int = Field(default=0, ge=0)


class AnalyzedConcept(BaseModel):
    id: ConceptId
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    difficulty: int = Field(ge=1, le=5)
    estimated_minutes: int = Field(gt=0)
    category: ConceptCategory
    source_evidence: str = Field(min_length=1)
    external_prerequisite: bool


class Dependency(BaseModel):
    concept_id: ConceptId
    prerequisites: list[ConceptId] = Field(default_factory=list)


class SourceAnalysis(BaseModel):
    title: str = Field(min_length=1)
    concepts: list[AnalyzedConcept] = Field(min_length=10, max_length=25)
    dependencies: list[Dependency]


class RelationshipRepair(BaseModel):
    dependencies: list[Dependency]


class Edge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_concept: ConceptId = Field(alias="from")
    to_concept: ConceptId = Field(alias="to")


class StudyPreferences(BaseModel):
    minutes_per_day: int = Field(default=30, gt=0, le=1440)
    start_date: date = Field(default_factory=date.today)
    target_date: date | None = None
    days_of_week: list[int] = Field(default_factory=lambda: list(range(7)), min_length=1)

    @field_validator("days_of_week")
    @classmethod
    def validate_days(cls, days: list[int]) -> list[int]:
        if any(day < 0 or day > 6 for day in days):
            raise ValueError("days_of_week values must be between 0 and 6")
        if len(days) != len(set(days)):
            raise ValueError("days_of_week cannot contain duplicates")
        return sorted(days)

    @model_validator(mode="after")
    def validate_target_date(self) -> StudyPreferences:
        if self.target_date and self.target_date < self.start_date:
            raise ValueError("target_date cannot be before start_date")
        return self


class GeneratePlanRequest(BaseModel):
    source: SourceInput
    preferences: StudyPreferences = Field(default_factory=StudyPreferences)


class StudySession(BaseModel):
    date: date
    concept_id: ConceptId
    duration_minutes: int = Field(gt=0)
    completed: bool = False


class PlanStatistics(BaseModel):
    concept_count: int = Field(ge=0)
    total_minutes: int = Field(ge=0)
    total_sessions: int = Field(ge=0)
    estimated_completion_date: date
    requested_target_date: date | None = None
    required_minutes_per_day: int | None = Field(default=None, gt=0)
    feasible: bool | None = None


class PlanResponse(BaseModel):
    id: str
    title: str
    concepts: list[Concept]
    edges: list[Edge]
    schedule: list[StudySession]
    statistics: PlanStatistics
