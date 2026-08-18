import type { BlogPost } from './posts';

export function buildPostPaths(posts: readonly BlogPost[]) {
  return posts.map((post, index) => ({
    params: { slug: post.id },
    props: {
      post,
      newer: posts[index - 1] ?? null,
      older: posts[index + 1] ?? null,
    },
  }));
}
