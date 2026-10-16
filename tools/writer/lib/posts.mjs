import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG.test(slug);
}

function toDateString(value) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function parsePost(source) {
  const match = source.match(FRONTMATTER);
  const data = match ? parse(match[1]) ?? {} : {};
  const body = match ? source.slice(match[0].length) : source;
  return {
    meta: {
      title: data.title ?? '',
      description: data.description ?? '',
      publishedAt: toDateString(data.publishedAt) ?? today(),
      updatedAt: toDateString(data.updatedAt),
      category: data.category ?? '学习笔记',
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      draft: data.draft !== false,
    },
    body: body.replace(/^\n+/, ''),
  };
}

// 手写 frontmatter，字段顺序和引号风格与现有文章保持一致。
export function serializePost({ meta, body }) {
  const lines = [
    '---',
    `title: ${JSON.stringify(meta.title ?? '')}`,
    `description: ${JSON.stringify(meta.description ?? '')}`,
    `publishedAt: ${meta.publishedAt}`,
  ];
  if (meta.updatedAt) lines.push(`updatedAt: ${meta.updatedAt}`);
  lines.push(
    `category: ${JSON.stringify(meta.category)}`,
    `tags: ${JSON.stringify(meta.tags ?? [])}`,
    `draft: ${meta.draft !== false}`,
    '---',
    '',
  );
  const text = (body ?? '').replace(/\r\n/g, '\n').trim();
  return `${lines.join('\n')}\n${text}\n`;
}

export function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function createPostStore(directory) {
  const pathOf = (slug) => join(directory, `${slug}.md`);

  return {
    pathOf,

    async list() {
      if (!existsSync(directory)) return [];
      const files = (await readdir(directory)).filter((file) => file.endsWith('.md'));
      const posts = await Promise.all(files.map(async (file) => {
        const slug = file.slice(0, -3);
        const { meta } = parsePost(await readFile(join(directory, file), 'utf8'));
        return { slug, title: meta.title, draft: meta.draft, publishedAt: meta.publishedAt, category: meta.category };
      }));
      return posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));
    },

    exists(slug) {
      return existsSync(pathOf(slug));
    },

    async read(slug) {
      return parsePost(await readFile(pathOf(slug), 'utf8'));
    },

    async write(slug, post) {
      await mkdir(directory, { recursive: true });
      await writeFile(pathOf(slug), serializePost(post), 'utf8');
    },

    async rename(from, to) {
      await rename(pathOf(from), pathOf(to));
    },

    async remove(slug) {
      await rm(pathOf(slug), { force: true });
    },

    // 新文章默认用日期做网址，比如 2026-10-16、2026-10-16-2。
    nextSlug() {
      const base = today();
      if (!this.exists(base)) return base;
      for (let n = 2; ; n += 1) {
        const slug = `${base}-${n}`;
        if (!this.exists(slug)) return slug;
      }
    },
  };
}
