import { describe, expect, it } from 'vitest';
import { postSchema } from '../../src/content/schema';

const valid = {
  title: '测试标题',
  description: '测试摘要',
  publishedAt: '2026-08-18',
  category: 'AI 安全',
  tags: ['提示词注入', '模型安全'],
  draft: true,
};

describe('postSchema', () => {
  it('accepts valid metadata and coerces dates', () => {
    const result = postSchema.parse(valid);
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it('rejects duplicate tags after trimming', () => {
    const result = postSchema.safeParse({ ...valid, tags: ['模型安全', ' 模型安全 '] });
    expect(result.success).toBe(false);
  });

  it('rejects a tag equal to the category', () => {
    const result = postSchema.safeParse({ ...valid, tags: ['AI 安全'] });
    expect(result.success).toBe(false);
  });

  it('rejects updatedAt before publishedAt', () => {
    const result = postSchema.safeParse({ ...valid, updatedAt: '2026-08-17' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown categories', () => {
    const result = postSchema.safeParse({ ...valid, category: '其他' });
    expect(result.success).toBe(false);
  });
});
