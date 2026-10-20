import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { blocksToMarkdown, richTextToMarkdown } from '../../tools/notion/to-markdown.mjs';
import { sync } from '../../tools/notion/sync.mjs';

const text = (content: string, annotations = {}, href: string | null = null) => ({
  type: 'text',
  plain_text: content,
  href,
  annotations: { bold: false, italic: false, strikethrough: false, code: false, ...annotations },
});
const block = (type: string, data: object, children?: object[]) => ({ id: `${type}-${Math.random()}`, type, [type]: data, ...(children ? { children } : {}) });
const para = (...parts: object[]) => block('paragraph', { rich_text: parts });

describe('Notion 正文转 Markdown', () => {
  it('转换行内格式，空格留在记号外面', () => {
    expect(richTextToMarkdown([
      text('先 '),
      text('fetch ', { bold: true }),
      text('再看', { italic: true }),
      text('git rebase', { code: true }),
      text('文档', {}, 'https://git-scm.com'),
      text(' 里的 *号'),
    ])).toBe('先 **fetch** *再看*`git rebase`[文档](https://git-scm.com) 里的 \\*号');
  });

  it('转换标题、列表、引用、代码和图片', () => {
    const markdown = blocksToMarkdown([
      block('heading_1', { rich_text: [text('今天学了什么')] }),
      para(text('第一段')),
      block('bulleted_list_item', { rich_text: [text('fetch')] }, [block('bulleted_list_item', { rich_text: [text('只下载')] })]),
      block('bulleted_list_item', { rich_text: [text('pull')] }),
      block('numbered_list_item', { rich_text: [text('一')] }),
      block('numbered_list_item', { rich_text: [text('二')] }),
      block('quote', { rich_text: [text('引用')] }),
      block('code', { rich_text: [text('git rebase --continue')], language: 'shell' }),
      block('image', { type: 'file', file: { url: 'https://s3/x.png' }, caption: [text('冲突提示')] }),
      block('divider', {}),
    ], { imageUrl: () => '/images/posts/a/1.webp' });
    expect(markdown).toBe([
      '## 今天学了什么',
      '第一段',
      '- fetch\n  - 只下载\n- pull',
      '1. 一\n2. 二',
      '> 引用',
      '```bash\ngit rebase --continue\n```',
      '![冲突提示](/images/posts/a/1.webp)',
      '---',
    ].join('\n\n'));
  });

  it('不认识的块跳过并记下来', () => {
    const warnings: string[] = [];
    expect(blocksToMarkdown([block('audio', {}), para(text('正文'))], { warnings })).toBe('正文');
    expect(warnings).toEqual(['跳过了不支持的内容：audio']);
  });
});

const page = (id: string, props: { title?: string; date?: string; publish?: boolean; slug?: string; category?: string }) => ({
  id,
  created_time: '2026-10-20T00:00:00.000Z',
  properties: {
    标题: { type: 'title', title: props.title ? [text(props.title)] : [] },
    摘要: { type: 'rich_text', rich_text: [text('一句话')] },
    分类: { type: 'select', select: { name: props.category ?? '学习笔记' } },
    项目: { type: 'select', select: { name: 'Git 学习' } },
    标签: { type: 'multi_select', multi_select: [{ name: 'Git' }] },
    日期: { type: 'date', date: { start: props.date ?? '2026-10-20' } },
    网址: { type: 'rich_text', rich_text: props.slug ? [text(props.slug)] : [] },
    发布: { type: 'checkbox', checkbox: props.publish ?? true },
  },
});

describe('Notion 同步', () => {
  let root: string | undefined;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it('写入已发布的文章和图片，删掉取消发布的，不碰手写文章', async () => {
    root = await mkdtemp(join(tmpdir(), 'notion-'));
    const posts = join(root, 'src/content/blog');
    await mkdir(posts, { recursive: true });
    await writeFile(join(posts, 'handwritten.md'), '---\ntitle: "手写"\n---\n');
    await writeFile(join(posts, 'old-note.md'), '---\ntitle: "旧"\nnotion: "gone"\n---\n');
    const png = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#c6613f' } }).png().toBuffer();
    const pages = [
      page('p1', { title: '第一次遇到 rebase 冲突', slug: 'rebase-conflict' }),
      page('p2', { title: '没写完', publish: false }),
      page('p3', { title: '', date: '2026-10-19' }),
    ];
    const notion = {
      queryDatabase: async () => pages,
      blocks: async (id: string) => (id === 'p1'
        ? [para(text('正文')), block('image', { type: 'file', file: { url: 'https://s3/a.png' }, caption: [] })]
        : []),
    };

    const report = await sync({ token: 'x', databaseId: 'db', notion, root, download: async () => png, log: () => {} });

    expect(report.written).toEqual(['rebase-conflict']);
    expect(report.removed).toEqual(['old-note']);
    expect(report.skipped).toHaveLength(1);
    expect((await readdir(posts)).sort()).toEqual(['handwritten.md', 'rebase-conflict.md']);
    const source = await readFile(join(posts, 'rebase-conflict.md'), 'utf8');
    expect(source).toContain('project: "Git 学习"');
    expect(source).toContain('notion: "p1"');
    expect(source).toMatch(/!\[\]\(\/images\/posts\/rebase-conflict\/[0-9a-f]{12}\.webp\)/);
    expect(await readdir(join(root, 'public/images/posts/rebase-conflict'))).toHaveLength(1);

    // 再跑一次没有变化。
    const again = await sync({ token: 'x', databaseId: 'db', notion, root, download: async () => png, log: () => {} });
    expect(again.written).toEqual([]);
    expect(again.unchanged).toEqual(['rebase-conflict']);
  });
});
