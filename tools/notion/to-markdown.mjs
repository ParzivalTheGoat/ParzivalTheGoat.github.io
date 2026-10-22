// 把 Notion 的页面属性和内容块转成网站用的 frontmatter 和 Markdown。
// 这里只做纯转换，不联网，图片地址由调用方换成仓库里的路径。

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Notion 数据库里的字段名。改字段名时只改这里。
export const FIELDS = {
  title: '标题',
  description: '摘要',
  category: '分类',
  project: '项目',
  tags: '标签',
  publishedAt: '日期',
  updatedAt: '更新日期',
  slug: '网址',
  publish: '发布',
};

const plain = (richText = []) => richText.map((part) => part.plain_text ?? '').join('').trim();

function property(page, name) {
  return page.properties?.[name];
}

function readProperty(page, name) {
  const value = property(page, name);
  if (!value) return undefined;
  switch (value.type) {
    case 'title': return plain(value.title);
    case 'rich_text': return plain(value.rich_text);
    case 'select': return value.select?.name;
    case 'multi_select': return value.multi_select.map((option) => option.name);
    case 'date': return value.date?.start?.slice(0, 10);
    case 'checkbox': return value.checkbox;
    default: return undefined;
  }
}

export function isPublished(page) {
  return readProperty(page, FIELDS.publish) === true && !page.archived && !page.in_trash;
}

/** 页面属性 → 文章 meta。缺的必填项留空，由网站的 postSchema 报错。 */
export function readMeta(page) {
  const project = readProperty(page, FIELDS.project);
  return {
    title: readProperty(page, FIELDS.title) ?? '',
    description: readProperty(page, FIELDS.description) ?? '',
    publishedAt: readProperty(page, FIELDS.publishedAt) ?? page.created_time?.slice(0, 10),
    updatedAt: readProperty(page, FIELDS.updatedAt) || undefined,
    category: readProperty(page, FIELDS.category) ?? '',
    project: project || undefined,
    tags: readProperty(page, FIELDS.tags) ?? [],
    draft: false,
  };
}

/** 文章网址：优先用「网址」字段，否则用日期；重名时加 -2、-3。 */
export function chooseSlug(page, meta, taken) {
  const wanted = (readProperty(page, FIELDS.slug) ?? '').toLowerCase();
  if (wanted && !SLUG.test(wanted)) throw new Error(`「${meta.title}」的网址只能用小写字母、数字和连字符：${wanted}`);
  const base = wanted || meta.publishedAt;
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

export function serializePost({ meta, body, notionId }) {
  const lines = [
    '---',
    `title: ${JSON.stringify(meta.title)}`,
    `description: ${JSON.stringify(meta.description)}`,
    `publishedAt: ${meta.publishedAt}`,
  ];
  if (meta.updatedAt) lines.push(`updatedAt: ${meta.updatedAt}`);
  lines.push(`category: ${JSON.stringify(meta.category)}`);
  if (meta.project) lines.push(`project: ${JSON.stringify(meta.project)}`);
  lines.push(
    `tags: ${JSON.stringify(meta.tags)}`,
    `draft: ${meta.draft}`,
    // 记下来源，Notion 里取消发布或删掉时，同步会把这篇一起删掉。
    `notion: ${JSON.stringify(notionId)}`,
    '---',
    '',
  );
  return `${lines.join('\n')}\n${body.trim()}\n`;
}

/* ---------- 正文 ---------- */

// 普通文字里会被 Markdown 当成格式的符号。
const escapeText = (text) => text.replace(/([\\`*_[\]<>])/g, '\\$1');

function wrap(text, mark) {
  // 记号不能贴着空格，否则 Markdown 不认：把首尾空格挪到记号外面。
  const [, before, inner, after] = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return inner ? `${before}${mark}${inner}${mark}${after}` : text;
}

export function richTextToMarkdown(richText = []) {
  return richText.map((part) => {
    if (part.type === 'equation') return `$${part.equation.expression}$`;
    const { bold, italic, strikethrough, code } = part.annotations ?? {};
    let text = code ? `\`${part.plain_text.replaceAll('`', 'ˋ')}\`` : escapeText(part.plain_text);
    if (!code) text = text.replace(/\n/g, '  \n');
    if (italic) text = wrap(text, '*');
    if (bold) text = wrap(text, '**');
    if (strikethrough) text = wrap(text, '~~');
    const href = part.href ?? part.text?.link?.url;
    if (href) text = `[${text}](${href})`;
    return text;
  }).join('');
}

const CODE_LANGUAGES = { 'plain text': '', shell: 'bash', 'c++': 'cpp', 'c#': 'csharp', 'objective-c': 'objc' };

const indent = (text, prefix) => text.split('\n').map((line) => (line ? prefix + line : line)).join('\n');

/**
 * 内容块（已带好 children）→ Markdown。
 * imageUrl(block) 返回这张图在网站上的地址；不认识的块记进 warnings。
 * @param {any[]} blocks
 * @param {{ imageUrl?: (block: any) => string | undefined, warnings?: string[] }} [options]
 */
export function blocksToMarkdown(blocks, { imageUrl = (block) => block.image?.file?.url ?? block.image?.external?.url, warnings = [] } = {}) {
  const parts = [];
  let number = 0;

  for (const block of blocks) {
    const data = block[block.type] ?? {};
    const text = () => richTextToMarkdown(data.rich_text);
    const children = () => (block.children?.length ? blocksToMarkdown(block.children, { imageUrl, warnings }) : '');
    number = block.type === 'numbered_list_item' ? number + 1 : 0;
    // 列表项之间不空行，连成一个列表。
    const tight = ['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(block.type);

    let out;
    switch (block.type) {
      case 'paragraph':
        out = [text(), children()].filter(Boolean).join('\n\n');
        break;
      // 文章标题已经是 h1，正文从二级标题开始。
      case 'heading_1': out = `## ${text()}`; break;
      case 'heading_2': out = `### ${text()}`; break;
      case 'heading_3': out = `#### ${text()}`; break;
      case 'bulleted_list_item':
      case 'numbered_list_item':
      case 'to_do': {
        const marker = block.type === 'numbered_list_item' ? `${number}.` : '-';
        const box = block.type === 'to_do' ? (data.checked ? '[x] ' : '[ ] ') : '';
        const nested = children();
        out = `${marker} ${box}${text()}` + (nested ? `\n${indent(nested, ' '.repeat(marker.length + 1))}` : '');
        break;
      }
      case 'quote':
        out = indent([text(), children()].filter(Boolean).join('\n\n'), '> ').replace(/^$/gm, '>');
        break;
      case 'callout': {
        const icon = data.icon?.type === 'emoji' ? `${data.icon.emoji} ` : '';
        out = indent([icon + text(), children()].filter(Boolean).join('\n\n'), '> ').replace(/^$/gm, '>');
        break;
      }
      case 'toggle':
        out = [`**${text()}**`, children()].filter(Boolean).join('\n\n');
        break;
      case 'code': {
        const language = data.language in CODE_LANGUAGES ? CODE_LANGUAGES[data.language] : data.language;
        const source = (data.rich_text ?? []).map((part) => part.plain_text).join('');
        const fence = source.includes('```') ? '````' : '```';
        out = `${fence}${language}\n${source}\n${fence}`;
        break;
      }
      case 'equation': out = `$$\n${data.expression}\n$$`; break;
      case 'divider': out = '---'; break;
      case 'image': {
        const url = imageUrl(block);
        const alt = plain(data.caption).replace(/[[\]]/g, '');
        out = url ? `![${alt}](${url})` : '';
        break;
      }
      case 'bookmark':
      case 'embed':
      case 'link_preview': {
        const caption = plain(data.caption);
        out = data.url ? `[${caption || data.url}](${data.url})` : '';
        break;
      }
      case 'table': {
        const rows = (block.children ?? []).map((row) => row.table_row.cells.map((cell) => richTextToMarkdown(cell).replaceAll('|', '\\|')));
        if (rows.length === 0) break;
        const width = Math.max(...rows.map((row) => row.length));
        const line = (cells) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? '').join(' | ')} |`;
        out = [line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n');
        break;
      }
      case 'column_list':
      case 'column':
      case 'synced_block':
        out = children();
        break;
      case 'table_of_contents':
      case 'breadcrumb':
        out = '';
        break;
      default:
        warnings.push(`跳过了不支持的内容：${block.type}`);
        out = '';
    }

    if (out === undefined || out === '') continue;
    const previous = parts.at(-1);
    if (tight && previous?.tight === block.type) previous.text += `\n${out}`;
    else parts.push({ text: out, tight: tight ? block.type : null });
  }

  return parts.map((part) => part.text).join('\n\n');
}
