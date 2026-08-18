import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../config/site';
import { getPublishedPosts } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? new URL(SITE.url),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: `/posts/${post.id}/`,
    })),
    customData: '<language>zh-CN</language>',
  });
}
