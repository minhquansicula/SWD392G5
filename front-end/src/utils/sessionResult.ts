import type { SessionDetail } from '../services/aiService';

/** Reject malformed AI data rather than rendering it as a valid grade sheet. */
export function validateSessionRubric(detail: SessionDetail): void {
  const report = detail.ai_report;
  if (report == null) return;
  const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
  if (typeof report !== 'object' || !Array.isArray(report.criteria)
      || !report.criteria.every(c => c && typeof c === 'object'
        && typeof c.criterion_id === 'string' && c.criterion_id.trim() !== ''
        && typeof c.name === 'string' && typeof c.assessed === 'boolean'
        && finite(c.weight) && c.weight >= 0 && c.weight <= 100
        && finite(c.score) && c.score >= 0 && c.score <= 10
        && (c.rationale == null || typeof c.rationale === 'string')
        && (c.improvement == null || typeof c.improvement === 'string'))) {
    throw new Error('Dữ liệu tiêu chí chấm điểm từ máy chủ không hợp lệ. Vui lòng thử tải lại.');
  }
}
