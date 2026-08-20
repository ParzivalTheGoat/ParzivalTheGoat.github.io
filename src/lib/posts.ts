import { getCollection, type CollectionEntry } from 'astro:content';
import readingTime from 'reading-time';

export type BlogPost = CollectionEntry<'blog'>;
export type TaxonomyCount = { name: string; count: number };

export function getTagHref(tag: string): string {
  return `/tags/${encodeURIComponent(tag)}/`;
}

export function getPostHref(postId: string): string {
  return `/posts/${encodeURIComponent(postId)}/`;
}

export function sortPosts(posts: readonly BlogPost[]): BlogPost[] {
  return [...posts].sort((left, right) => {
    const byDate = right.data.publishedAt.getTime() - left.data.publishedAt.getTime();
    return byDate || left.id.localeCompare(right.id, 'zh-CN');
  });
}

export function filterPublishedPosts(posts: readonly BlogPost[], now = new Date()): BlogPost[] {
  return sortPosts(posts.filter((post) => !post.data.draft && post.data.publishedAt <= now));
}

export async function getPublishedPosts(now = new Date()): Promise<BlogPost[]> {
  return filterPublishedPosts(await getCollection('blog'), now);
}

function count(values: string[]): TaxonomyCount[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, total]) => ({ name, count: total }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

export function getTaxonomyCounts(posts: readonly BlogPost[]) {
  return {
    categories: count(posts.map((post) => post.data.category)),
    tags: count(posts.flatMap((post) => post.data.tags)),
  };
}

export function paginatePosts(posts: readonly BlogPost[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return { items: posts.slice(start, start + pageSize), currentPage, totalPages };
}

type PostMonthGroup = { key: string; items: BlogPost[] };

export function groupPostsByMonth(posts: readonly [BlogPost, ...BlogPost[]]): [PostMonthGroup, ...PostMonthGroup[]];
export function groupPostsByMonth(posts: readonly BlogPost[]): PostMonthGroup[];
export function groupPostsByMonth(posts: readonly BlogPost[]): PostMonthGroup[] {
  const groups = new Map<string, BlogPost[]>();
  for (const post of posts) {
    const key = post.data.publishedAt.toISOString().slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), post]);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items }));
}

export function getReadingMinutes(body: string): number {
  return Math.max(1, Math.ceil(readingTime(body).minutes));
}
