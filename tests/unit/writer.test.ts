import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { postSchema } from '../../src/content/schema';
import { compressImage, createRepoImageStore } from '../../tools/writer/lib/images.mjs';
import { isValidSlug, parsePost, serializePost } from '../../tools/writer/lib/posts.mjs';

const post = {
  meta: {
    title: '标题里有 "引号" 和: 冒号',
    description: '一句话摘要',
    publishedAt: '2026-10-16',
    category: '学习笔记',
    tags: ['CDN', 'WAF'],
    draft: true,
  },
  body: '## 今天学了什么\n\n正文。\n\n![图](/images/posts/demo/a.webp)',
};

describe('写作台的文章读写', () => {
  it('写出的 frontmatter 能原样读回来，并通过网站的校验', () => {
    const source = serializePost(post);
    const parsed = parsePost(source);
    expect(parsed.meta).toMatchObject(post.meta);
    expect(parsed.body.trim()).toBe(post.body);
    expect(postSchema.safeParse(parsed.meta).success).toBe(true);
  });

  it('项目字段能写进去、读回来，清空后不留在 frontmatter 里', () => {
    const inProject = parsePost(serializePost({ ...post, meta: { ...post.meta, project: 'CDN 和 WAF' } }));
    expect(inProject.meta.project).toBe('CDN 和 WAF');
    expect(postSchema.safeParse(inProject.meta).success).toBe(true);
    const cleared = serializePost({ ...post, meta: { ...post.meta, project: null } });
    expect(cleared).not.toContain('project:');
    expect(parsePost(cleared).meta.project).toBeUndefined();
  });

  it('读得懂网站现有文章的格式', () => {
    const parsed = parsePost('---\ntitle: "旧文章"\ndescription: "摘要"\npublishedAt: 2026-09-06\ncategory: "Web 安全"\ntags: ["CDN"]\ndraft: false\n---\n\n正文\n');
    expect(parsed.meta).toMatchObject({ title: '旧文章', publishedAt: '2026-09-06', draft: false, tags: ['CDN'] });
    expect(parsed.body).toBe('正文\n');
  });

  it('网址只接受小写字母、数字和短横线', () => {
    expect(isValidSlug('cdn-cache-waf')).toBe(true);
    expect(isValidSlug('2026-10-16-2')).toBe(true);
    expect(isValidSlug('../etc')).toBe(false);
    expect(isValidSlug('中文')).toBe(false);
  });
});

describe('写作台的图片', () => {
  let directory: string | undefined;
  afterEach(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it('把大截图压成不超过 1600px 宽的 WebP', async () => {
    const png = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: '#d0c0b0' } }).png().toBuffer();
    const { name, buffer } = await compressImage(png);
    const meta = await sharp(buffer).metadata();
    expect(name).toMatch(/^[0-9a-f]{12}\.webp$/);
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(1600);
  });

  it('删掉正文里不再引用的图片', async () => {
    directory = await mkdtemp(join(tmpdir(), 'writer-'));
    const store = createRepoImageStore(directory);
    const kept = await store.save('demo', 'keep.webp', Buffer.from('a'));
    await store.save('demo', 'drop.webp', Buffer.from('b'));
    const removed = await store.prune('demo', `![](${kept})`);
    expect(removed).toEqual(['drop.webp']);
    expect(await store.list('demo')).toEqual(['keep.webp']);
  });
});
