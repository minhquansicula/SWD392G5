from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class CourseCreate(StrictModel):
    name: str = Field(min_length=2, max_length=120)


class Criterion(StrictModel):
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,40}$")
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=10, max_length=2500)
    weight: int = Field(ge=1, le=100)


class RubricData(StrictModel):
    title: str = Field(min_length=2, max_length=150)
    criteria: list[Criterion] = Field(min_length=1, max_length=10)

    @model_validator(mode="after")
    def check_weights(self):
        if sum(c.weight for c in self.criteria) != 100:
            raise ValueError("Tổng trọng số rubric phải bằng 100%.")
        if len({c.id for c in self.criteria}) != len(self.criteria):
            raise ValueError("ID của các tiêu chí phải khác nhau.")
        return self


class SessionCreate(StrictModel):
    course_id: UUID
    rubric_id: UUID
    student_name: str = Field(default="Sinh viên", min_length=1, max_length=80)
    max_questions: int = Field(default=8, ge=1, le=20)
    max_followups: int = Field(default=2, ge=0, le=3)


class TurnRequest(StrictModel):
    request_id: UUID
    action: Literal["start", "answer"]
    text: str = Field(default="", max_length=4000)

    @model_validator(mode="after")
    def validate_action(self):
        if self.action == "answer" and not self.text:
            raise ValueError("Câu trả lời không được để trống.")
        if self.action == "start" and self.text:
            raise ValueError("Lượt bắt đầu không có câu trả lời.")
        return self


class Evidence(StrictModel):
    message_id: UUID
    quote: str = Field(min_length=1, max_length=500)


class CriterionGrade(StrictModel):
    criterion_id: str
    score: float = Field(ge=0, le=10, allow_inf_nan=False)
    rationale: str = Field(min_length=1, max_length=1600)
    evidence: list[Evidence] = Field(max_length=6)
    improvement: str = Field(min_length=1, max_length=1200)


class GradeDraft(StrictModel):
    criteria: list[CriterionGrade] = Field(min_length=1, max_length=10)
    summary: str = Field(min_length=1, max_length=2000)

    @field_validator("criteria")
    @classmethod
    def unique_criteria(cls, value):
        if len({c.criterion_id for c in value}) != len(value):
            raise ValueError("Duplicate grading criterion")
        return value
