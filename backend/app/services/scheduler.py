from __future__ import annotations

from datetime import date, timedelta
from math import ceil

from app.models import Concept, PlanStatistics, StudyPreferences, StudySession


def _next_study_day(day: date, allowed_days: set[int], *, include_current: bool) -> date:
    if not include_current:
        day += timedelta(days=1)
    while day.weekday() not in allowed_days:
        day += timedelta(days=1)
    return day


def _available_study_days(start: date, end: date, allowed_days: set[int]) -> int:
    return sum(
        (start + timedelta(days=offset)).weekday() in allowed_days
        for offset in range((end - start).days + 1)
    )


def create_schedule(
    concepts: list[Concept],
    preferences: StudyPreferences,
) -> tuple[list[StudySession], PlanStatistics]:
    if not concepts:
        raise ValueError("cannot schedule an empty concept list")

    allowed_days = set(preferences.days_of_week)
    current_day = _next_study_day(preferences.start_date, allowed_days, include_current=True)
    remaining_today = preferences.minutes_per_day
    sessions: list[StudySession] = []

    for concept in concepts:
        remaining_concept = concept.estimated_minutes
        while remaining_concept:
            if remaining_today == 0:
                current_day = _next_study_day(current_day, allowed_days, include_current=False)
                remaining_today = preferences.minutes_per_day
            duration = min(remaining_concept, remaining_today)
            sessions.append(
                StudySession(
                    date=current_day,
                    concept_id=concept.id,
                    duration_minutes=duration,
                )
            )
            remaining_concept -= duration
            remaining_today -= duration

    total_minutes = sum(concept.estimated_minutes for concept in concepts)
    required_minutes: int | None = None
    feasible: bool | None = None
    if preferences.target_date:
        available_days = _available_study_days(
            preferences.start_date,
            preferences.target_date,
            allowed_days,
        )
        if available_days:
            required_minutes = ceil(total_minutes / available_days)
            feasible = required_minutes <= preferences.minutes_per_day
        else:
            feasible = False

    statistics = PlanStatistics(
        concept_count=len(concepts),
        total_minutes=total_minutes,
        total_sessions=len(sessions),
        estimated_completion_date=sessions[-1].date,
        requested_target_date=preferences.target_date,
        required_minutes_per_day=required_minutes,
        feasible=feasible,
    )
    return sessions, statistics

