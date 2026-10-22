// 从 Notion 拉取勾了「发布」的文章，写进 src/content/blog/，图片转成 WebP 存进 public/images/posts/。
// 用法：NOTION_TOKEN=… NOTION_DATABASE_ID=… pnpm notion
// Notion 里取消发布或删掉的文章，这里也会删掉；手写的文章（没有 notion 字段）不碰。
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { postSchema } from '../../src/content/schema.ts';
import { createNotion } from './notion-api.mjs';
import { blocksToMarkdown, chooseSlug, FIELDS, isPublished, readMeta, serializePost } from './to-markdown.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const imageUrlOf = (slug, name) => `/images/posts/${slug}/${name}`;

// 截图压成 WebP：最长边不超过 1600px，动图保留动画。
export async function compressImage(input) {
  const image = sharp(input, { animated: true });
  const { pages = 1 } = await image.metadata();
  const buffer = await image
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80, effort: 5, ...(pages > 1 ? { loop: 0 } : {}) })
    .toBuffer();
  return { name: `${createHash('sha256').update(buffer).digest('hex').slice(0, 12)}.webp`, buffer };
}

async function readExisting(postsDir) {
  const posts = new Map(); // slug → notion id（手写文章为 null）
  if (!existsSync(postsDir)) return posts;
  for (const file of await readdir(postsDir)) {
    if (!file.endsWith('.md')) continue;
    const source = await readFile(join(postsDir, file), 'utf8');
    const id = source.match(/^---\r?\n[\s\S]*?^notion:\s*"?([\w-]+)"?\s*$/m)?.[1] ?? null;
    posts.set(file.slice(0, -3), id);
  }
  return posts;
}

function collectImages(blocks, found = []) {
  for (const block of blocks) {
    if (block.type === 'image') found.push(block);
    if (block.children) collectImages(block.children, found);
  }
  return found;
}

async function saveImages({ imagesDir, download }, slug, blocks, warnings) {
  const urls = new Map();
  const directory = join(imagesDir, slug);
  for (const block of collectImages(blocks)) {
    const source = block.image.file?.url ?? block.image.external?.url;
    try {
      const { name, buffer } = await compressImage(await download(source));
      await mkdir(directory, { recursive: true });
      if (!existsSync(join(directory, name))) await writeFile(join(directory, name), buffer);
      urls.set(block.id, imageUrlOf(slug, name));
    } catch (error) {
      warnings.push(`有一张图没存上：${error.message}`);
    }
  }
  // 删掉这篇不再用到的旧图。
  if (existsSync(directory)) {
    const used = new Set([...urls.values()].map((url) => url.split('/').pop()));
    for (const name of await readdir(directory)) if (!used.has(name)) await rm(join(directory, name));
    if ((await readdir(directory)).length === 0) await rm(directory, { recursive: true });
  }
  return urls;
}

/** @param {string} url @returns {Promise<Buffer>} */
async function fetchImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下载失败（${response.status}）`);
  return Buffer.from(await response.arrayBuffer());
}

export async function sync({ token, databaseId, notion = createNotion(token), root = repoRoot, download = fetchImage, log = console.log }) {
  const postsDir = join(root, 'src', 'content', 'blog');
  const imagesDir = join(root, 'public', 'images', 'posts');
  const existing = await readExisting(postsDir);
  const previousSlug = new Map([...existing].filter(([, id]) => id).map(([slug, id]) => [id, slug]));
  const taken = new Set([...existing].filter(([, id]) => !id).map(([slug]) => slug));
  const report = { written: [], unchanged: [], removed: [], skipped: [] };

  const pages = (await notion.queryDatabase(databaseId))
    .filter(isPublished)
    .map((page) => ({ page, meta: readMeta(page) }))
    .sort((a, b) => `${a.meta.publishedAt}${a.page.created_time}`.localeCompare(`${b.meta.publishedAt}${b.page.created_time}`));

  const kept = new Set();
  for (const { page, meta } of pages) {
    const warnings = [];
    const name = meta.title || '（没有标题）';
    const checked = postSchema.safeParse(meta);
    if (!checked.success) {
      const problems = checked.error.issues.map((issue) => `${issue.path.join('.') || '文章'}：${issue.message}`).join('；');
      report.skipped.push(`${name}：${problems}`);
      // 之前发布过的版本先留着，免得一篇写错就让网站少一篇。
      if (previousSlug.has(page.id)) kept.add(previousSlug.get(page.id));
      continue;
    }

    let slug;
    try {
      // 没填「网址」时沿用上次的网址，改了日期也不会让旧链接失效。
      const before = previousSlug.get(page.id);
      slug = before && !page.properties?.[FIELDS.slug]?.rich_text?.length ? before : chooseSlug(page, meta, taken);
    } catch (error) {
      report.skipped.push(`${name}：${error.message}`);
      if (previousSlug.has(page.id)) kept.add(previousSlug.get(page.id));
      continue;
    }
    taken.add(slug);
    kept.add(slug);

    const blocks = await notion.blocks(page.id);
    const urls = await saveImages({ imagesDir, download }, slug, blocks, warnings);
    const body = blocksToMarkdown(blocks, { imageUrl: (block) => urls.get(block.id), warnings });
    const text = serializePost({ meta, body, notionId: page.id });
    const file = join(postsDir, `${slug}.md`);
    const old = existsSync(file) ? await readFile(file, 'utf8') : null;
    if (old === text) report.unchanged.push(slug);
    else {
      await mkdir(postsDir, { recursive: true });
      await writeFile(file, text);
      report.written.push(slug);
    }
    for (const warning of warnings) log(`  ${slug}：${warning}`);
  }

  // Notion 里已经不发布的文章（或改了网址留下的旧文件）从网站删掉。
  for (const [slug, id] of existing) {
    if (!id || kept.has(slug)) continue;
    await rm(join(postsDir, `${slug}.md`));
    await rm(join(imagesDir, slug), { recursive: true, force: true });
    report.removed.push(slug);
  }

  return report;
}

async function main() {
  const { NOTION_TOKEN: token, NOTION_DATABASE_ID: databaseId } = process.env;
  if (!token || !databaseId) {
    console.error('缺少 NOTION_TOKEN 或 NOTION_DATABASE_ID，设置方法见 tools/notion/README.md');
    // 定时任务在还没配好密钥时安静跳过，不要每小时报一次错。
    process.exit(process.env.CI ? 0 : 1);
  }
  const report = await sync({ token, databaseId });
  const lines = [
    `更新 ${report.written.length} 篇：${report.written.join('、') || '无'}`,
    `删除 ${report.removed.length} 篇：${report.removed.join('、') || '无'}`,
    `没变 ${report.unchanged.length} 篇`,
    ...report.skipped.map((reason) => `没同步：${reason}`),
  ];
  console.log(lines.join('\n'));
  // 在 GitHub Actions 里，把结果写进运行摘要，并告诉后面的步骤有没有改动。
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Notion 同步\n\n${lines.map((line) => `- ${line}`).join('\n')}\n`);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${report.written.length + report.removed.length > 0}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
