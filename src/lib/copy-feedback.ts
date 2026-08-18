type CopyButton = { textContent: string | null };
type ClipboardWriter = { writeText(text: string): Promise<void> };

export function createCopyFeedback(button: CopyButton, clipboard: ClipboardWriter) {
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;

  return async (source: string): Promise<boolean> => {
    try {
      await clipboard.writeText(source);
    } catch {
      return false;
    }

    if (restoreTimer !== undefined) clearTimeout(restoreTimer);
    button.textContent = '已复制';
    restoreTimer = setTimeout(() => {
      button.textContent = '复制';
      restoreTimer = undefined;
    }, 2000);
    return true;
  };
}
