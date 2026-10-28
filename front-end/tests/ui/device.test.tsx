import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceCheckDialog } from '../../src/components/interview/DeviceCheckDialog';
import { deferred, installAudio } from './helpers';

describe('preflight device exceptions', () => {
  let audio: ReturnType<typeof installAudio>;
  beforeEach(() => { audio = installAudio(); });
  function mount(confirm = vi.fn().mockResolvedValue(undefined)) {
    return { ...render(<DeviceCheckDialog language="vi" examTitle="SWD392" onClose={vi.fn()} onConfirm={confirm} />), confirm };
  }
  async function ready() {
    fireEvent.click(screen.getByRole('button', { name: 'Cho phép & Kiểm tra micro' }));
    await screen.findByRole('button', { name: 'Kiểm tra lại micro' });
    fireEvent.click(screen.getByRole('button', { name: 'Phát âm thanh thử' }));
    await waitFor(() => expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('checkbox'));
  }
  it('cannot start until both device checks have been confirmed', async () => {
    const view = mount(); expect((screen.getByRole('button', { name: 'Xác nhận & Bắt đầu thi' }) as HTMLButtonElement).disabled).toBe(true);
    await ready(); fireEvent.click(screen.getByRole('button', { name: 'Xác nhận & Bắt đầu thi' }));
    await waitFor(() => expect(view.confirm).toHaveBeenCalledTimes(1)); expect(audio.tracks[0].stop).toHaveBeenCalled();
  });
  it('permission denied is an inline error, never an exam-start request', async () => {
    audio.media.mockRejectedValue(new DOMException('denied', 'NotAllowedError')); const view = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Cho phép & Kiểm tra micro' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Micro đang bị chặn')); expect(view.confirm).not.toHaveBeenCalled();
  });
  it('stops media granted after the device dialog was dismissed', async () => {
    const pending = deferred<MediaStream>(); audio.media.mockReturnValue(pending.promise); const view = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Cho phép & Kiểm tra micro' })); view.unmount();
    await act(async () => pending.resolve(audio.stream)); expect(audio.tracks[0].stop).toHaveBeenCalled();
  });
  it('a missing AudioContext produces an inline speaker error, not an unhandled rejection', async () => {
    vi.stubGlobal('AudioContext', undefined); mount();
    fireEvent.click(screen.getByRole('button', { name: 'Phát âm thanh thử' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Không phát được âm thanh'));
  });
  it('blocks repeat start after an uncertain network failure', async () => {
    const view = mount(vi.fn().mockRejectedValue(Object.assign(new Error('Network Error'), { isAxiosError: true })));
    await ready(); fireEvent.click(screen.getByRole('button', { name: 'Xác nhận & Bắt đầu thi' }));
    await screen.findByRole('alert'); expect(screen.getByText(/Chưa xác định máy chủ/)).not.toBeNull();
    expect((screen.getByRole('button', { name: 'Xác nhận & Bắt đầu thi' }) as HTMLButtonElement).disabled).toBe(true); expect(view.confirm).toHaveBeenCalledTimes(1);
  });
});
