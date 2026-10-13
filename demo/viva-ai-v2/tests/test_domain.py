import io
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError
from pypdf import PdfWriter

from app.documents import DocumentParser
from app.errors import AppError
from app.gemini import normalized_vector
from app.interview import next_plan, validate_report
from app.schemas import GradeDraft, RubricData, TurnRequest


def rubric():
    return {
        "title": "Rubric kiểm thử",
        "criteria": [
            {
                "id": f"c{i}",
                "name": f"Tiêu chí {i}",
                "description": "Giải thích chính xác và có ví dụ.",
                "weight": 25,
            }
            for i in range(4)
        ],
    }


@pytest.mark.parametrize("limit", [4, 5, 8, 12, 20])
@pytest.mark.parametrize("max_followups", [0, 1, 2, 3])
def test_scheduler_reserves_coverage_and_caps_followups(limit, max_followups):
    session = SimpleNamespace(
        rubric_snapshot=rubric(),
        questions_asked=0,
        max_questions=limit,
        criterion_index=0,
        followups_used=0,
        max_followups=max_followups,
    )
    visited, probes = set(), {}
    while (plan := next_plan(session)) is not None:
        key = plan["criterion"]["id"]
        visited.add(key)
        probes[key] = probes.get(key, 0) + int(plan["follow_up"])
        session.questions_asked += 1
        session.criterion_index = plan["criterion_index"]
        session.followups_used = plan["followups_used"]
    assert len(visited) == 4
    assert session.questions_asked <= limit
    assert max(probes.values()) <= max_followups


def test_rubric_rejects_wrong_weights_and_duplicate_ids():
    data = rubric()
    RubricData.model_validate(data)
    data["criteria"][0]["weight"] = 30
    with pytest.raises(ValidationError):
        RubricData.model_validate(data)
    data["criteria"][0]["weight"] = 25
    data["criteria"][1]["id"] = "c0"
    with pytest.raises(ValidationError):
        RubricData.model_validate(data)


def test_vector_rejects_wrong_dimensions_zero_and_nonfinite():
    for values in ([1.0], [0.0] * 768, [float("nan")] * 768):
        with pytest.raises(AppError):
            normalized_vector(values)
    v = normalized_vector([2.0] + [0.0] * 767)
    assert v[0] == 1 and sum(x * x for x in v) == 1


def test_parser_rejects_scans_and_preserves_page_metadata():
    parser = DocumentParser()
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    output = io.BytesIO()
    writer.write(output)
    with pytest.raises(AppError, match="OCR"):
        parser.parse("scan.pdf", output.getvalue(), 10000)
    pages = parser.parse("lecture.txt", ("Kiến thức có dấu. " * 300).encode(), 10000)
    chunks = parser.chunks(pages)
    assert len(chunks) > 1
    assert all(len(c["text"]) <= 1400 and c["page"] is None for c in chunks)
    with pytest.raises(AppError):
        parser.parse("script.exe", b"MZ", 10000)


def test_report_rejects_fabricated_and_assistant_evidence():
    user_id, assistant_id = uuid4(), uuid4()
    messages = [
        {"id": str(user_id), "role": "user", "text": "Redis là hệ thống lưu trữ trong bộ nhớ."},
        {"id": str(assistant_id), "role": "assistant", "text": "TTL là gì?"},
    ]
    draft = GradeDraft.model_validate(
        {
            "criteria": [
                {
                    "criterion_id": c["id"],
                    "score": 8,
                    "rationale": "Lý do chấm điểm.",
                    "evidence": [{"message_id": str(user_id), "quote": "Redis là hệ thống"}],
                    "improvement": "Nêu thêm ví dụ.",
                }
                for c in rubric()["criteria"]
            ],
            "summary": "Tổng kết.",
        }
    )
    assert validate_report(draft, rubric(), messages)["total_score"] == 8
    draft.criteria[0].evidence[0].quote = "Trích dẫn không tồn tại"
    with pytest.raises(AppError):
        validate_report(draft, rubric(), messages)
    draft.criteria[0].evidence[0].quote = "TTL là gì?"
    draft.criteria[0].evidence[0].message_id = assistant_id
    with pytest.raises(AppError):
        validate_report(draft, rubric(), messages)


def test_turn_rejects_empty_answers():
    with pytest.raises(ValidationError):
        TurnRequest(request_id=uuid4(), action="answer", text="  ")
