import { describe, expect, it } from 'vitest';
import { findDesignViolations } from '../../scripts/design-guard.mjs';

describe('findDesignViolations', () => {
  it('rejects gradients', () => {
    expect(findDesignViolations('bad.css', 'body { background: linear-gradient(red, black); }'))
      .toEqual([{ file: 'bad.css', rule: 'gradient' }]);
  });

  it('rejects repeating conic gradients', () => {
    expect(findDesignViolations('bad.css', 'body { background: repeating-conic-gradient(red, black); }'))
      .toEqual([{ file: 'bad.css', rule: 'gradient' }]);
  });

  it('rejects border radius', () => {
    expect(findDesignViolations('bad.css', '.button { border-radius: 4px; }'))
      .toEqual([{ file: 'bad.css', rule: 'border-radius' }]);
  });

  it('rejects corner and logical border radius declarations', () => {
    expect(findDesignViolations('bad.css', '.button { border-top-left-radius: 4px; border-start-start-radius: 4px; }'))
      .toEqual([
        { file: 'bad.css', rule: 'border-radius' },
        { file: 'bad.css', rule: 'border-radius' },
      ]);
  });

  it('rejects card selectors and card class attributes', () => {
    expect(findDesignViolations('bad.astro', '<section class="post-card"></section>\n.post-card {}'))
      .toEqual([
        { file: 'bad.astro', rule: 'card-name' },
        { file: 'bad.astro', rule: 'card-name' },
      ]);
  });

  it('accepts flat ruled layouts', () => {
    expect(findDesignViolations('good.css', '.post-row { border-top: 1px solid var(--rule); }'))
      .toEqual([]);
  });
});
