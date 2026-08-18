import { describe, expect, it } from 'vitest';
import type { CollectionEntry } from 'astro:content';
import {
  filterPublishedPosts,
  getReadingMinutes,
  getTaxonomyCounts,
  groupPostsByMonth,
  paginatePosts,
  sortPosts,
} from '../../src/lib/posts';

type BlogPost = CollectionEntry<'blog'>;

function post(id: string, date: string, draft = false, category = 'AI', tags = ['模型安全']): BlogPost {
  return {
    id,
    collection: 'blog',
    body: '测试文本',
    data: {
      title: id,
      description: '测试摘要',
      publishedAt: new Date(date),
      category,
      tags,
      draft,
    },
  } as BlogPost;
}

describe('post helpers', () => {
  it('removes drafts and future posts', () => {
    const posts = [post('published', '2026-08-01'), post('draft', '2026-08-01', true), post('future', '2026-09-01')];
    expect(filterPublishedPosts(posts, new Date('2026-08-18')).map((item) => item.id)).toEqual(['published']);
  });

  it('sorts newest first with stable id fallback', () => {
    const posts = [post('b', '2026-08-01'), post('a', '2026-08-01'), post('newest', '2026-08-02')];
    expect(sortPosts(posts).map((item) => item.id)).toEqual(['newest', 'a', 'b']);
  });

  it('counts categories and tags', () => {
    const counts = getTaxonomyCounts([post('one', '2026-08-01'), post('two', '2026-08-02', false, 'AI 安全', ['模型安全'])]);
    expect(counts.categories).toEqual([{ name: 'AI', count: 1 }, { name: 'AI 安全', count: 1 }]);
    expect(counts.tags).toEqual([{ name: '模型安全', count: 2 }]);
  });

  it('paginates without inventing pages', () => {
    const result = paginatePosts([post('one', '2026-08-01')], 1, 10);
    expect(result).toMatchObject({ currentPage: 1, totalPages: 1 });
    expect(result.items).toHaveLength(1);
  });

  it('groups by year and month', () => {
    expect(groupPostsByMonth([post('one', '2026-08-01')])[0].key).toBe('2026-08');
  });

  it('returns at least one reading minute', () => {
    expect(getReadingMinutes('短文本')).toBe(1);
  });
});
