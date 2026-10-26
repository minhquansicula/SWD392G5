import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '../../src/components/ui';
import { lockBodyScroll } from '../../src/utils/scrollLock';

describe('dialog and scroll-lock exceptions', () => {
  it('releases nested locks in any order and is safe to release twice', () => {
    document.body.style.overflow = 'auto';
    const first = lockBodyScroll(); const second = lockBodyScroll();
    first(); first(); expect(document.body.style.overflow).toBe('hidden');
    second(); expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });
  it('Escape cancellation is blocked while busy and allowed afterward', () => {
    const onClose = vi.fn();
    const view = render(<Dialog title="Example" onClose={onClose} busy>Content</Dialog>);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true })); expect(onClose).not.toHaveBeenCalled();
    view.rerender(<Dialog title="Example" onClose={onClose}>Content</Dialog>);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true })); expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('returns focus to a connected opener and restores scroll on unmount', () => {
    const opener = document.createElement('button'); document.body.append(opener); opener.focus();
    const view = render(<Dialog title="Example" onClose={vi.fn()}>Content</Dialog>);
    screen.getByRole('button', { name: 'Đóng' }).focus(); view.unmount();
    expect(document.activeElement).toBe(opener); expect(document.body.style.overflow).toBe(''); opener.remove();
  });
});
