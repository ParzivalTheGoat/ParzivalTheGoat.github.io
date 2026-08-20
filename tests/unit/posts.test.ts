import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import {
  filterPublishedPosts,
  getPostHref,
  getReadingMinutes,
  getTagHref,
  getTaxonomyCounts,
  groupPostsByMonth,
  paginatePosts,
  sortPosts,
  getPublishedPosts,
} from '../../src/lib/posts';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

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
  afterEach(() => vi.clearAllMocks());

  it('loads the blog collection and returns published posts at the supplied now', async () => {
    const now = new Date('2026-08-18T12:00:00.000Z');
    const posts = [
      post('future', '2026-08-19T00:00:00.000Z'),
      post('older', '2026-08-01T00:00:00.000Z'),
      post('at-now', '2026-08-18T12:00:00.000Z'),
      post('draft', '2026-08-17T00:00:00.000Z', true),
    ];
    vi.mocked(getCollection).mockResolvedValue(posts);

    const result = await getPublishedPosts(now);

    expect(getCollection).toHaveBeenCalledWith('blog');
    expect(result.map((item) => item.id)).toEqual(['at-now', 'older']);
  });

  it('removes drafts and future posts', () => {
    const posts = [post('published', '2026-08-01'), post('draft', '2026-08-01', true), post('future', '2026-09-01')];
    expect(filterPublishedPosts(posts, new Date('2026-08-18')).map((item) => item.id)).toEqual(['published']);
  });

  it('includes the exact now boundary and excludes one instant later', () => {
    const now = new Date('2026-08-18T12:00:00.000Z');
    const atNow = post('at-now', now.toISOString());
    const oneInstantLater = post('one-instant-later', new Date(now.getTime() + 1).toISOString());

    expect(filterPublishedPosts([oneInstantLater, atNow], now).map((item) => item.id)).toEqual(['at-now']);
  });

  it('sorts newest first with stable id fallback', () => {
    const posts = [post('b', '2026-08-01'), post('a', '2026-08-01'), post('newest', '2026-08-02')];
    const original = [...posts];

    expect(sortPosts(posts).map((item) => item.id)).toEqual(['newest', 'a', 'b']);
    filterPublishedPosts(posts, new Date('2026-08-03'));
    expect(posts).toEqual(original);
  });

  it('counts categories and tags', () => {
    const counts = getTaxonomyCounts([post('one', '2026-08-01'), post('two', '2026-08-02', false, 'AI 安全', ['模型安全'])]);
    expect(counts.categories).toEqual([{ name: 'AI', count: 1 }, { name: 'AI 安全', count: 1 }]);
    expect(counts.tags).toEqual([{ name: '模型安全', count: 2 }]);
  });

  it('encodes reserved characters in tag route segments', () => {
    expect(getTagHref('C#')).toBe('/tags/C%23/');
    expect(getTagHref('a/b?c')).toBe('/tags/a%2Fb%3Fc/');
  });

  it('encodes reserved characters in post route segments', () => {
    expect(getPostHref('C#')).toBe('/posts/C%23/');
    expect(getPostHref('a/b?c')).toBe('/posts/a%2Fb%3Fc/');
  });

  it('paginates without inventing pages', () => {
    const result = paginatePosts([post('one', '2026-08-01')], 1, 10);
    expect(result).toMatchObject({ currentPage: 1, totalPages: 1 });
    expect(result.items).toHaveLength(1);
  });

  it('paginates empty input as one empty page', () => {
    expect(paginatePosts([], 1, 10)).toEqual({ items: [], currentPage: 1, totalPages: 1 });
  });

  it('groups by year and month', () => {
    expect(groupPostsByMonth([post('one', '2026-08-01')])[0].key).toBe('2026-08');
  });

  it('groups empty input into no month groups', () => {
    expect(groupPostsByMonth([])).toEqual([]);
  });

  it('returns at least one reading minute', () => {
    expect(getReadingMinutes('短文本')).toBe(1);
  });
});
