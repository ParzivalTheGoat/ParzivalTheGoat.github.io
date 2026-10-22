import { z } from 'astro/zod';

export const CATEGORIES = ['网络安全', 'Web 安全', 'AI', 'AI 安全', '学习笔记', '个人感悟'] as const;
export type Category = (typeof CATEGORIES)[number];

const tagsSchema = z.array(z.string().trim().min(1)).superRefine((tags, context) => {
  const seen = new Set<string>();
  for (const [index, tag] of tags.entries()) {
    if (seen.has(tag)) {
      context.addIssue({ code: 'custom', path: [index], message: `标签重复：${tag}` });
    }
    seen.add(tag);
  }
});

export const postSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  category: z.enum(CATEGORIES),
  // 同一个学习项目下的几篇笔记，比如“CDN 和 WAF”。不填就是单篇。
  project: z.string().trim().min(1).optional(),
  tags: tagsSchema,
  draft: z.boolean(),
}).superRefine((post, context) => {
  if (post.updatedAt && post.updatedAt < post.publishedAt) {
    context.addIssue({ code: 'custom', path: ['updatedAt'], message: 'updatedAt 不得早于 publishedAt' });
  }
  if (post.tags.includes(post.category)) {
    context.addIssue({ code: 'custom', path: ['tags'], message: '标签不得与分类同名' });
  }
});
