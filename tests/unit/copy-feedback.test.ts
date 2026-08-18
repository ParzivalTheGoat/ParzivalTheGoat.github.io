import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCopyFeedback } from '../../src/lib/copy-feedback';

describe('createCopyFeedback', () => {
  afterEach(() => vi.useRealTimers());

  it('resolves false and leaves the label unchanged when copying fails', async () => {
    const button = { textContent: '复制' };
    const clipboard = { writeText: vi.fn().mockRejectedValue(new Error('denied')) };
    const copy = createCopyFeedback(button, clipboard);

    await expect(copy('const value = 1;')).resolves.toBe(false);
    expect(button.textContent).toBe('复制');
  });

  it('restores two seconds after the latest successful copy', async () => {
    vi.useFakeTimers();
    const button = { textContent: '复制' };
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    const copy = createCopyFeedback(button, clipboard);

    await copy('first');
    await vi.advanceTimersByTimeAsync(1000);
    await copy('second');
    await vi.advanceTimersByTimeAsync(1000);

    expect(button.textContent).toBe('已复制');

    await vi.advanceTimersByTimeAsync(1000);

    expect(button.textContent).toBe('复制');
    expect(clipboard.writeText).toHaveBeenCalledWith('second');
  });
});
