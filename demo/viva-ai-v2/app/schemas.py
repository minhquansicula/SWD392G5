from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


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


class Evidence(StrictModel):
    transcript_id: UUID | None = None
    message_id: UUID | None = None
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


class GenerateQuestionsRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=20, description="Số lượng câu hỏi muốn sinh (1 - 20)")
    difficulty: str | None = Field(default="BALANCED", description="Độ khó: BALANCED, EASY, MEDIUM, HARD")
    topic_hint: str | None = Field(default=None, max_length=255, description="Chủ đề cụ thể muốn tập trung (nếu có)")


class QuestionItemSchema(BaseModel):
    content: str = Field(description="Nội dung câu hỏi vấn đáp chính")
    difficulty_level: str = Field(description="Độ khó: EASY, MEDIUM, hoặc HARD")
    topic: str = Field(description="Chủ đề hoặc module kiến thức tương ứng")
    expected_answer: str = Field(description="Barem câu trả lời mẫu gợi ý cho Giám khảo AI đối chiếu")


class GeneratedQuestionsResponse(BaseModel):
    course_id: str
    course_name: str
    total_generated: int
    questions: list[QuestionItemSchema]

