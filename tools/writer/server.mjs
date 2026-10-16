// 本地写作台：pnpm write 启动，只监听 127.0.0.1，网站上不会出现编辑入口。
import { createServer as createHttpServer } from 'node:http';
import { createReadStream, existsSync, realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { createGit } from './lib/git.mjs';
import { compressImage, createRepoImageStore } from './lib/images.mjs';
import { createPostStore, isValidSlug, today } from './lib/posts.mjs';
import { TEMPLATES } from './lib/templates.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const port = Number(process.env.WRITER_PORT ?? 4400);
const shouldOpen = !process.argv.includes('--no-open');

const posts = createPostStore(join(root, 'src/content/blog'));
const images = createRepoImageStore(join(root, 'public'));
const git = createGit(root, ['src/content/blog', 'public/images/posts']);

const vite = await createViteServer({
  root: join(here, 'app'),
  configFile: false,
  logLevel: 'warn',
  appType: 'spa',
  server: { middlewareMode: true, hmr: { port: port + 1 }, fs: { allow: [root, realpathSync(join(root, 'node_modules'))] } },
});

// 直接复用网站的 Zod 校验，写作台和构建对文章的要求永远一致。
const { CATEGORIES, postSchema } = await vite.ssrLoadModule(join(root, 'src/content/schema.ts'));

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readBody(request, limit = 30 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, '文件太大了（上限 30 MB）');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const readJson = async (request) => JSON.parse((await readBody(request)).toString('utf8') || '{}');

function send(response, status, data) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

function requireSlug(slug) {
  if (!isValidSlug(slug)) throw new HttpError(400, '网址只能用小写字母、数字和短横线');
  return slug;
}

function requirePost(slug) {
  requireSlug(slug);
  if (!posts.exists(slug)) throw new HttpError(404, '找不到这篇文章');
  return slug;
}

function validate(meta) {
  const result = postSchema.safeParse(meta);
  if (result.success) return [];
  const labels = { title: '标题', description: '摘要', publishedAt: '日期', updatedAt: '更新日期', category: '分类', tags: '标签' };
  return result.error.issues.map((issue) => {
    const field = labels[issue.path[0]] ?? issue.path.join('.');
    if (issue.code === 'too_small') return `${field}还没填`;
    return `${field}：${issue.message}`;
  });
}

const routes = [
  ['GET', /^\/api\/meta$/, async () => ({
    categories: CATEGORIES,
    templates: TEMPLATES.map(({ id, name, hint, prompts }) => ({ id, name, hint, prompts: prompts.map((p) => p.heading) })),
  })],

  ['GET', /^\/api\/posts$/, async () => posts.list()],

  ['POST', /^\/api\/posts$/, async (request) => {
    const { template: templateId } = await readJson(request);
    const template = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0];
    const slug = posts.nextSlug();
    const post = {
      meta: { title: '', description: '', publishedAt: today(), category: template.category, tags: [], draft: true },
      body: template.prompts.map((prompt) => `## ${prompt.heading}\n`).join('\n'),
    };
    await posts.write(slug, post);
    return { slug, ...post };
  }],

  ['GET', /^\/api\/posts\/([^/]+)$/, async (_request, [slug]) => ({ slug, ...(await posts.read(requirePost(slug))) })],

  ['PUT', /^\/api\/posts\/([^/]+)$/, async (request, [slug]) => {
    requirePost(slug);
    const { meta, body } = await readJson(request);
    const current = await posts.read(slug);
    // 草稿状态只能通过“发布”和“撤回”改，自动保存不会意外上线。
    await posts.write(slug, { meta: { ...current.meta, ...meta, draft: current.meta.draft }, body });
    return { savedAt: new Date().toISOString() };
  }],

  ['DELETE', /^\/api\/posts\/([^/]+)$/, async (_request, [slug]) => {
    requirePost(slug);
    if (!(await posts.read(slug)).meta.draft) throw new HttpError(409, '已发布的文章不能在这里删除，先撤回成草稿');
    await posts.remove(slug);
    await images.removeAll(slug);
    return { deleted: slug };
  }],

  ['POST', /^\/api\/posts\/([^/]+)\/rename$/, async (request, [slug]) => {
    requirePost(slug);
    const { to } = await readJson(request);
    requireSlug(to);
    if (to === slug) return { slug };
    if (posts.exists(to)) throw new HttpError(409, '这个网址已经被另一篇文章用了');
    const post = await posts.read(slug);
    if (!post.meta.draft) throw new HttpError(409, '发布后改网址会让旧链接失效，先撤回成草稿再改');
    await images.move(slug, to);
    const body = post.body.replaceAll(`${images.prefix}/${slug}/`, `${images.prefix}/${to}/`);
    await posts.write(to, { ...post, body });
    await posts.remove(slug);
    return { slug: to, body };
  }],

  ['POST', /^\/api\/posts\/([^/]+)\/images$/, async (request, [slug]) => {
    requirePost(slug);
    const input = await readBody(request);
    if (input.length === 0) throw new HttpError(400, '没有收到图片');
    let compressed;
    try {
      compressed = await compressImage(input);
    } catch {
      throw new HttpError(415, '这个文件不像是图片');
    }
    const url = await images.save(slug, compressed.name, compressed.buffer);
    return { url, before: input.length, after: compressed.buffer.length };
  }],

  ['POST', /^\/api\/posts\/([^/]+)\/publish$/, async (request, [slug]) => {
    requirePost(slug);
    const { meta, body } = await readJson(request);
    const current = await posts.read(slug);
    const wasDraft = current.meta.draft;
    const next = { ...current.meta, ...meta, draft: false };
    if (!wasDraft && next.publishedAt !== today()) next.updatedAt = today();
    const problems = validate(next);
    if (problems.length) throw new HttpError(422, problems.join('；'));
    await posts.write(slug, { meta: next, body });
    await images.prune(slug, body);
    const result = await git.commitAndPush(`content: ${wasDraft ? '发布' : '更新'}《${next.title}》`);
    return { ...result, meta: next };
  }],

  ['POST', /^\/api\/posts\/([^/]+)\/unpublish$/, async (_request, [slug]) => {
    requirePost(slug);
    const post = await posts.read(slug);
    await posts.write(slug, { ...post, meta: { ...post.meta, draft: true } });
    const result = await git.commitAndPush(`content: 撤回《${post.meta.title}》`);
    return { ...result, meta: { ...post.meta, draft: true } };
  }],

  ['GET', /^\/api\/sync$/, async () => git.status()],

  // 同步：提交两台电脑之间的草稿改动，再拉取对方的改动。
  ['POST', /^\/api\/sync$/, async () => {
    for (const post of await posts.list()) {
      const { body } = await posts.read(post.slug);
      await images.prune(post.slug, body);
    }
    const result = await git.commitAndPush('content: 同步草稿');
    return { ...result, status: await git.status() };
  }],
];

async function serveImage(request, response) {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://local').pathname));
  const file = join(root, 'public', path);
  if (!file.startsWith(join(root, 'public', 'images') + sep) || !existsSync(file)) return false;
  response.writeHead(200, { 'content-type': file.endsWith('.webp') ? 'image/webp' : 'application/octet-stream' });
  createReadStream(file).pipe(response);
  return true;
}

const server = createHttpServer(async (request, response) => {
  const { pathname } = new URL(request.url, 'http://local');
  try {
    if (pathname.startsWith('/images/') && (await serveImage(request, response))) return;
    if (pathname.startsWith('/api/')) {
      for (const [method, pattern, handler] of routes) {
        const match = pathname.match(pattern);
        if (match && request.method === method) {
          return send(response, 200, await handler(request, match.slice(1).map(decodeURIComponent)));
        }
      }
      throw new HttpError(404, '没有这个接口');
    }
    vite.middlewares(request, response);
  } catch (error) {
    if (!(error instanceof HttpError)) console.error(error);
    send(response, error.status ?? 500, { error: error.message });
  }
});

function openBrowser(url) {
  const [command, args] = process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '', url]]
    : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  spawn(command, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

server.listen(port, '127.0.0.1', async () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`\n  写作台已启动：${url}\n`);
  try {
    const result = await git.pull();
    console.log(result.pulled ? '  已和远程仓库对齐。' : `  跳过拉取：${result.reason}`);
  } catch (error) {
    console.warn(`  ${error.message}`);
  }
  if (shouldOpen) openBrowser(url);
});
