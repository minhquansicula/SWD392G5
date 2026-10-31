from app.interview import validate_report
from app.schemas import GradeDraft

RUBRIC = {
    "criteria": [
        {"id": "knowledge", "name": "Kiến thức", "weight": 60},
        {"id": "clarity", "name": "Diễn đạt", "weight": 40},
    ]
}


def test_report_keeps_per_question_scores_and_weighted_total():
    draft = GradeDraft.model_validate(
        {
            "criteria": [
                {"criterion_id": "knowledge", "score": 8, "rationale": "Đúng.", "evidence": [{"quote": "Redis"}]},
                {"criterion_id": "clarity", "score": 12, "rationale": "Rõ."},
            ],
            "questions": [
                {"question_id": "q1", "score": 9, "feedback": "Tốt."},
                {"question_id": "q2", "answered": False, "score": 7},
                {"question_id": "unknown", "score": 10},
            ],
            "summary": "Tổng kết.",
        }
    )
    report = validate_report(draft, RUBRIC, ["q1", "q2"])

    assert report["total_score"] == 8.8  # 8*0.6 + clamp(12)=10 * 0.4
    assert report["assessed_criteria"] == 2
    assert report["criteria"][0]["evidence"] == [{"quote": "Redis"}]
    assert report["questions"] == [
        {"question_id": "q1", "answered": True, "score": 9.0, "feedback": "Tốt."},
        {"question_id": "q2", "answered": False, "score": 0.0, "feedback": None},
    ]


def test_report_never_invents_scores_for_missing_grades():
    report = validate_report(GradeDraft(), RUBRIC, ["q1"])

    assert report["total_score"] == 0
    assert report["assessed_criteria"] == 0
    assert all(not c["assessed"] and c["evidence"] == [] for c in report["criteria"])
    assert report["questions"] == [{"question_id": "q1", "answered": None, "score": None, "feedback": None}]
