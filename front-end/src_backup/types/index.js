// ============================================================
// AIVES — TypeScript Type Definitions
// ============================================================
// ---------- Enums ----------
export var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["LECTURER"] = "LECTURER";
    Role["STUDENT"] = "STUDENT";
})(Role || (Role = {}));
export var DifficultyLevel;
(function (DifficultyLevel) {
    DifficultyLevel["EASY"] = "EASY";
    DifficultyLevel["MEDIUM"] = "MEDIUM";
    DifficultyLevel["HARD"] = "HARD";
})(DifficultyLevel || (DifficultyLevel = {}));
export var ScheduleStatus;
(function (ScheduleStatus) {
    ScheduleStatus["PENDING"] = "PENDING";
    ScheduleStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ScheduleStatus["COMPLETED"] = "COMPLETED";
    ScheduleStatus["GRADED"] = "GRADED";
})(ScheduleStatus || (ScheduleStatus = {}));
export var TranscriptRole;
(function (TranscriptRole) {
    TranscriptRole["AI"] = "AI";
    TranscriptRole["STUDENT"] = "STUDENT";
})(TranscriptRole || (TranscriptRole = {}));
export var SessionPhase;
(function (SessionPhase) {
    SessionPhase["AWAITING_QUESTION"] = "AWAITING_QUESTION";
    SessionPhase["DELIVERING_QUESTION"] = "DELIVERING_QUESTION";
    SessionPhase["AWAITING_RESPONSE"] = "AWAITING_RESPONSE";
    SessionPhase["PROCESSING_RESPONSE"] = "PROCESSING_RESPONSE";
    SessionPhase["COMPLETED"] = "COMPLETED";
})(SessionPhase || (SessionPhase = {}));
/** Client-side interview state machine states */
export var InterviewState;
(function (InterviewState) {
    InterviewState["IDLE"] = "IDLE";
    InterviewState["WAITING_FOR_QUESTION"] = "WAITING_FOR_QUESTION";
    InterviewState["PLAYING_QUESTION"] = "PLAYING_QUESTION";
    InterviewState["RECORDING_ANSWER"] = "RECORDING_ANSWER";
    InterviewState["UPLOADING_AUDIO"] = "UPLOADING_AUDIO";
    InterviewState["PROCESSING"] = "PROCESSING";
    InterviewState["SESSION_COMPLETE"] = "SESSION_COMPLETE";
    InterviewState["RESTORING"] = "RESTORING";
})(InterviewState || (InterviewState = {}));
/** Types of signaling events from server → client via STOMP */
export var InterviewEventType;
(function (InterviewEventType) {
    InterviewEventType["QUESTION_DELIVERED"] = "QUESTION_DELIVERED";
    InterviewEventType["FOLLOWUP_QUESTION"] = "FOLLOWUP_QUESTION";
    InterviewEventType["WAITING_FOR_RESPONSE"] = "WAITING_FOR_RESPONSE";
    InterviewEventType["SESSION_COMPLETE"] = "SESSION_COMPLETE";
    InterviewEventType["TRANSCRIPT_UPDATE"] = "TRANSCRIPT_UPDATE";
    InterviewEventType["SESSION_RESTORED"] = "SESSION_RESTORED";
    InterviewEventType["ERROR"] = "ERROR";
})(InterviewEventType || (InterviewEventType = {}));
