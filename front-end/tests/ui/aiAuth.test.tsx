import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiClient, getAiCourses, getSessionDetail, deleteCourseRubric } from '../../src/services/aiService';

describe('AI request authentication', () => {
  const adapter = vi.fn();
  beforeEach(() => {
    adapter.mockReset().mockImplementation(async config => ({ data: config.url === '/api/v1/courses' ? [] : {}, status: 200, statusText: 'OK', headers: {}, config }));
    aiClient.defaults.adapter = adapter;
  });
  it('sends the current token on reads and mutations, never in the URL', async () => {
    localStorage.setItem('accessToken', 'first-token');
    await getAiCourses();
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer first-token');
    localStorage.setItem('accessToken', 'second-token');
    await getSessionDetail('schedule');
    await deleteCourseRubric('course', 'rubric');
    for (const [config] of adapter.mock.calls.slice(1)) {
      expect(config.headers.Authorization).toBe('Bearer second-token');
      expect(config.url).not.toContain('token');
    }
  });
  it('does not call the AI server anonymously', async () => {
    await expect(getAiCourses()).rejects.toThrow('đăng nhập');
    expect(adapter).not.toHaveBeenCalled();
  });
});
