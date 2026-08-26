from datetime import date

from app.models import Concept, ConceptCategory, StudyPreferences
from app.services.scheduler import create_schedule


def concept(minutes: int) -> Concept:
    return Concept(
        id="test_concept",
        name="Test Concept",
        description="Test concept",
        difficulty=2,
        estimated_minutes=minutes,
        category=ConceptCategory.FOUNDATION,
        source_evidence="Test evidence",
    )


def test_study_session_splitting() -> None:
    sessions, _ = create_schedule(
        [concept(90)],
        StudyPreferences(minutes_per_day=30, start_date=date(2026, 8, 27)),
    )

    assert [session.duration_minutes for session in sessions] == [30, 30, 30]
    assert [session.concept_id for session in sessions] == ["test_concept"] * 3


def test_completion_date_skips_unavailable_days() -> None:
    _, statistics = create_schedule(
        [concept(90)],
        StudyPreferences(
            minutes_per_day=30,
            start_date=date(2026, 8, 27),
            days_of_week=[0, 1, 2, 3, 4],
        ),
    )

    assert statistics.estimated_completion_date == date(2026, 8, 31)


def test_target_date_feasibility() -> None:
    _, statistics = create_schedule(
        [concept(90)],
        StudyPreferences(
            minutes_per_day=30,
            start_date=date(2026, 8, 27),
            target_date=date(2026, 8, 28),
        ),
    )

    assert statistics.required_minutes_per_day == 45
    assert statistics.feasible is False

