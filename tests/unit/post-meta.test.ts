import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { BlogPost } from '../../src/lib/posts';
import PostMeta from '../../src/components/PostMeta.astro';
import { describe, expect, it } from 'vitest';

function post(updatedAt?: Date): BlogPost {
  return {
    id: 'entry',
    collection: 'blog',
    body: '',
    data: {
      title: 'Title',
      description: 'Description',
      publishedAt: new Date('2026-08-01T00:00:00.000Z'),
      ...(updatedAt ? { updatedAt } : {}),
      category: 'AI',
      tags: ['模型安全'],
      draft: false,
    },
  } as BlogPost;
}

describe('PostMeta', () => {
  it('renders updatedAt only when the post provides it', async () => {
    const container = await AstroContainer.create();
    const updatedAt = new Date('2026-08-02T00:00:00.000Z');
    const withoutUpdate = await container.renderToString(PostMeta, { props: { post: post() } });
    const withUpdate = await container.renderToString(PostMeta, { props: { post: post(updatedAt) } });

    expect(withoutUpdate).not.toContain(updatedAt.toISOString());
    expect(withUpdate).toContain(updatedAt.toISOString());
  });
});
