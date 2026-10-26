import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExamConfirmation } from '../../src/components/exams/lecturer/ExamConfirmation';
import { deferred } from './helpers';

describe('mutation confirmation exceptions', () => {
  const props = { title: 'Confirm mutation', description: 'Irreversible action', confirmLabel: 'Confirm', language: 'en' as const, onClose: vi.fn() };
  it('deduplicates confirmation while a mutation is in flight', async () => {
    const pending = deferred<void>(); const onConfirm = vi.fn().mockReturnValue(pending.promise);
    render(<ExamConfirmation {...props} onConfirm={onConfirm} />);
    const button = screen.getByRole('button', { name: 'Confirm' });
    act(() => { fireEvent.click(button); fireEvent.click(button); }); expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve());
  });
  it('blocks resubmission after an uncertain network failure', async () => {
    const onConfirm = vi.fn().mockRejectedValue(Object.assign(new Error('offline'), { isAxiosError: true }));
    render(<ExamConfirmation {...props} onConfirm={onConfirm} />); fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await screen.findByRole('alert'); expect((screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('allows correcting/retrying a definite server validation failure', async () => {
    const onConfirm = vi.fn().mockRejectedValue(Object.assign(new Error('Invalid time'), { isAxiosError: true, response: { status: 400, data: { message: 'Invalid time' } } }));
    render(<ExamConfirmation {...props} onConfirm={onConfirm} />); fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await screen.findByRole('alert'); expect((screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
