# Parzival's Lab Personal Technical Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, verify, publish, and deploy an empty Astro technical blog for `ParzivalTheGoat` at `https://parzivalthegoat.github.io`.

**Architecture:** Astro renders a fully static site from a validated local Markdown content collection. Pure TypeScript helpers own publication filtering, taxonomy, pagination, reading-time, and adjacent-post behavior; Pagefind Extended creates the static Chinese search index after Astro builds. GitHub Actions runs quality checks and deploys the generated site to GitHub Pages.

**Tech Stack:** Astro 6, TypeScript strict mode, pnpm 11, Node 24, Astro content collections, Pagefind Extended, Vitest, Playwright, axe-core, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-18-personal-technical-blog-design.md`

## Global Constraints

- Use Node `24.x`; Astro requires an even Node release at least `22.12.0`. Do not use the machine-default Node `25.9.0`.
- Use the bundled Node at `C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` and bundled pnpm at `C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd` locally.
- Repository and Pages site name: `ParzivalTheGoat.github.io`; canonical URL: `https://parzivalthegoat.github.io`.
- Site title: `Parzival's Lab`; factual description: `ParzivalTheGoat 的个人技术博客`.
- Do not create Markdown posts, example posts, placeholder posts, slogans, promotional copy, or fictional biography text.
- About content is limited to `ParzivalTheGoat` and `https://github.com/ParzivalTheGoat`.
- Do not add comments, a database, an SSR adapter, a CMS, or a custom domain.
- Do not use gradients, `border-radius`, card components, card class names, pill tags, rounded overlays, or rounded navigation.
- A card-like structure may be added only after the user explicitly authorizes it in a new design decision.
- Light palette: background `#F2EEE5`, text `#27251F`, muted `#6D675E`, rule `#C8C1B5`, accent `#A94E32`.
- Dark palette: background `#191815`, text `#E9E2D6`, muted `#A89F91`, rule `#504B42`, accent `#E5A287`.
- Bundle Newsreader, Noto Serif SC, and JetBrains Mono locally; do not use an external font CDN or Claude's proprietary font files.
- Every task ends with focused tests and a focused commit. Stage only files listed in that task.

## File Responsibility Map

### Project and quality configuration

- `package.json`: scripts, package metadata, Node and package-manager requirements.
- `pnpm-lock.yaml`: exact dependency lock.
- `.nvmrc`: Node `24` declaration for contributors.
- `astro.config.mjs`: canonical site URL, sitemap integration, Markdown and build options.
- `tsconfig.json`: Astro strict TypeScript configuration.
- `vitest.config.ts`: unit-test configuration through Astro's Vite config.
- `playwright.config.ts`: production-preview end-to-end configuration.
- `scripts/design-guard.mjs`: reusable forbidden-style scanner.
- `scripts/design-guard.d.mts`: scanner type declarations.
- `scripts/validate-design.mjs`: scans source and generated HTML/CSS and exits nonzero on violations.
- `.github/workflows/deploy.yml`: quality, build, and GitHub Pages deployment workflow.

### Site model and helpers

- `src/config/site.ts`: immutable site identity, URLs, locale, navigation, and page size.
- `src/content/schema.ts`: categories and Zod article schema.
- `src/content.config.ts`: Astro `blog` collection loader.
- `src/content/blog/.gitkeep`: preserves an intentionally empty content directory.
- `src/lib/posts.ts`: published-post filtering, sorting, taxonomy counts, pagination, archive grouping, and reading time.
- `src/lib/post-paths.ts`: static article path and adjacent-post props.

### Presentation

- `src/styles/fonts.css`: local Fontsource imports.
- `src/styles/tokens.css`: light/dark theme tokens.
- `src/styles/global.css`: reset, typography, links, focus, layout primitives, and responsive rules.
- `src/styles/prose.css`: long-form Markdown typography and square code-block treatment.
- `src/components/BaseHead.astro`: metadata, canonical URL, RSS link, and pre-render theme initialization.
- `src/components/SiteHeader.astro`: flat navigation and theme control.
- `src/components/SiteFooter.astro`: copyright, GitHub, and RSS links.
- `src/components/ThemeToggle.astro`: accessible persisted theme switch.
- `src/components/PostMeta.astro`: date, category, tags, and reading time.
- `src/components/PostList.astro`: ruled article list or `暂无文章`.
- `src/components/Pagination.astro`: flat previous/next pagination links.
- `src/components/TableOfContents.astro`: heading links without a containing card.
- `src/components/SearchView.astro`: Pagefind form and flat result list.
- `src/layouts/BaseLayout.astro`: shared document shell.
- `src/layouts/PostLayout.astro`: article header, contents, progress line, prose, and adjacent links.

### Routes

- `src/pages/index.astro`: title and latest-post region with no slogan.
- `src/pages/posts/index.astro`: first article-list page.
- `src/pages/posts/page/[page].astro`: article-list pages after page one.
- `src/pages/posts/[...slug].astro`: static article pages.
- `src/pages/categories/index.astro`: category totals.
- `src/pages/categories/[category].astro`: category article lists.
- `src/pages/tags/index.astro`: tag totals.
- `src/pages/tags/[tag].astro`: tag article lists.
- `src/pages/archive/index.astro`: year/month archive.
- `src/pages/search.astro`: search route.
- `src/pages/about.astro`: username and GitHub link only.
- `src/pages/rss.xml.ts`: published-post RSS.
- `src/pages/404.astro`: neutral not-found page.

### Tests

- `tests/unit/design-guard.test.ts`: forbidden CSS and card-pattern detection.
- `tests/unit/content-schema.test.ts`: metadata and taxonomy validation.
- `tests/unit/posts.test.ts`: filtering, sorting, taxonomy, pagination, archive, and reading-time logic.
- `tests/unit/post-paths.test.ts`: article path and adjacency mapping.
- `tests/e2e/shell.spec.ts`: metadata, navigation, empty state, About restrictions, and theme persistence.
- `tests/e2e/routes.spec.ts`: public route, RSS, sitemap, and 404 smoke tests.
- `tests/e2e/search.spec.ts`: production Pagefind loading and no-result behavior.
- `tests/e2e/accessibility.spec.ts`: axe checks, keyboard focus, reduced motion, and mobile overflow.

---

### Task 1: Bootstrap Astro and enforce the visual prohibitions

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `.nvmrc`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/config/site.ts`
- Create: `src/styles/fonts.css`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/pages/index.astro`
- Create: `scripts/design-guard.mjs`
- Create: `scripts/design-guard.d.mts`
- Create: `scripts/validate-design.mjs`
- Create: `tests/unit/design-guard.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `SITE`, CSS tokens, `findDesignViolations(filePath, source)`, and the package scripts used by every later task.
- Consumes: the approved spec only.

- [ ] **Step 1: Select the supported runtime and confirm versions**

Run in PowerShell:

```powershell
$env:Path = 'C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;' + $env:Path
node --version
pnpm --version
```

Expected: Node reports `v24.19.0` or another `v24.x` release, and pnpm reports `11.19.0` or another `v11.x` release.

- [ ] **Step 2: Initialize package metadata and install exact dependency families**

Run:

```powershell
pnpm init
pnpm add astro@latest @astrojs/rss@latest @astrojs/sitemap@latest reading-time@latest @fontsource-variable/newsreader@latest @fontsource/noto-serif-sc@latest @fontsource-variable/jetbrains-mono@latest
pnpm add -D @astrojs/check@latest typescript@latest vitest@latest @playwright/test@latest @axe-core/playwright@latest pagefind@latest
```

Set these `package.json` fields after installation:

```json
{
  "name": "parzival-the-goat-blog",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.19.0",
  "engines": {
    "node": ">=24 <25"
  },
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest",
    "build:site": "astro build",
    "build:search": "pagefind --site dist",
    "validate:design": "node scripts/validate-design.mjs",
    "build": "pnpm run build:site && pnpm run build:search && pnpm run validate:design",
    "preview": "astro preview",
    "test:e2e": "playwright test",
    "verify": "pnpm run check && pnpm run test && pnpm run build && pnpm run test:e2e"
  }
}
```

Keep the dependency sections generated by pnpm. Commit `pnpm-lock.yaml`.

- [ ] **Step 3: Write the failing design-guard tests**

Create `tests/unit/design-guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findDesignViolations } from '../../scripts/design-guard.mjs';

describe('findDesignViolations', () => {
  it('rejects gradients', () => {
    expect(findDesignViolations('bad.css', 'body { background: linear-gradient(red, black); }'))
      .toEqual([{ file: 'bad.css', rule: 'gradient' }]);
  });

  it('rejects border radius', () => {
    expect(findDesignViolations('bad.css', '.button { border-radius: 4px; }'))
      .toEqual([{ file: 'bad.css', rule: 'border-radius' }]);
  });

  it('rejects card selectors and card class attributes', () => {
    expect(findDesignViolations('bad.astro', '<section class="post-card"></section>\n.post-card {}'))
      .toEqual([
        { file: 'bad.astro', rule: 'card-name' },
        { file: 'bad.astro', rule: 'card-name' },
      ]);
  });

  it('accepts flat ruled layouts', () => {
    expect(findDesignViolations('good.css', '.post-row { border-top: 1px solid var(--rule); }'))
      .toEqual([]);
  });
});
```

- [ ] **Step 4: Run the test and confirm the expected failure**

Run:

```powershell
pnpm test -- tests/unit/design-guard.test.ts
```

Expected: FAIL because `scripts/design-guard.mjs` does not exist.

- [ ] **Step 5: Implement the scanner and executable validator**

Create `scripts/design-guard.mjs`:

```js
const RULES = [
  { rule: 'gradient', pattern: /\b(?:linear|radial|conic|repeating-linear|repeating-radial)-gradient\s*\(/gi },
  { rule: 'border-radius', pattern: /\bborder(?:-[a-z]+)?-radius\s*:/gi },
  { rule: 'card-name', pattern: /(?:\.[a-z0-9_-]*card[a-z0-9_-]*\b|class\s*=\s*["'][^"']*\b[a-z0-9_-]*card[a-z0-9_-]*\b[^"']*["'])/gi },
];

export function findDesignViolations(file, source) {
  return RULES.flatMap(({ rule, pattern }) => {
    pattern.lastIndex = 0;
    return Array.from(source.matchAll(pattern), () => ({ file, rule }));
  });
}
```

Create `scripts/design-guard.d.mts`:

```ts
export type DesignViolation = { file: string; rule: string };
export function findDesignViolations(file: string, source: string): DesignViolation[];
```

Create `scripts/validate-design.mjs`:

```js
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { findDesignViolations } from './design-guard.mjs';

const roots = ['src', 'dist'];
const extensions = new Set(['.astro', '.css', '.html']);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}

const files = (await Promise.all(roots.map(walk))).flat().filter((file) => extensions.has(extname(file)));
const violations = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  violations.push(...findDesignViolations(relative(process.cwd(), file), source));
}

if (violations.length > 0) {
  console.error(JSON.stringify(violations, null, 2));
  process.exitCode = 1;
}
```

- [ ] **Step 6: Add the minimal Astro configuration, site identity, fonts, and flat tokens**

Create `.nvmrc` with `24`.

Create `astro.config.mjs`:

```js
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://parzivalthegoat.github.io',
  integrations: [sitemap()],
  trailingSlash: 'always',
});
```

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strictest",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

Create `vitest.config.ts`:

```ts
/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

Create `src/config/site.ts`:

```ts
export const SITE = {
  title: "Parzival's Lab",
  description: 'ParzivalTheGoat 的个人技术博客',
  url: 'https://parzivalthegoat.github.io',
  author: 'ParzivalTheGoat',
  github: 'https://github.com/ParzivalTheGoat',
  locale: 'zh-CN',
  postsPerPage: 10,
} as const;
```

Create `src/styles/fonts.css`:

```css
@import '@fontsource-variable/newsreader/wght.css';
@import '@fontsource/noto-serif-sc/400.css';
@import '@fontsource/noto-serif-sc/600.css';
@import '@fontsource-variable/jetbrains-mono/wght.css';
```

Create `src/styles/tokens.css`:

```css
:root {
  color-scheme: light dark;
  --background: #f2eee5;
  --text: #27251f;
  --muted: #6d675e;
  --rule: #c8c1b5;
  --accent: #a94e32;
  --content-width: 74rem;
  --reading-width: 44rem;
}

:root[data-theme='dark'] {
  --background: #191815;
  --text: #e9e2d6;
  --muted: #a89f91;
  --rule: #504b42;
  --accent: #e5a287;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --background: #191815;
    --text: #e9e2d6;
    --muted: #a89f91;
    --rule: #504b42;
    --accent: #e5a287;
  }
}
```

Create `src/styles/global.css` with a flat reset and no `border-radius` declaration:

```css
@import './fonts.css';
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; }
html { background: var(--background); color: var(--text); font-family: Newsreader, 'Noto Serif SC', serif; }
body { margin: 0; min-width: 20rem; min-height: 100vh; }
a { color: inherit; text-decoration-color: var(--accent); text-underline-offset: 0.2em; }
a:hover { color: var(--accent); }
button, input { color: inherit; font: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.shell { width: min(100% - 2rem, var(--content-width)); margin-inline: auto; }
.mono { font-family: 'JetBrains Mono', monospace; }
.muted { color: var(--muted); }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; } }
```

Create the temporary buildable `src/pages/index.astro`:

```astro
---
import { SITE } from '../config/site';
import '../styles/global.css';
---
<html lang={SITE.locale}>
  <head><meta charset="utf-8" /><title>{SITE.title}</title></head>
  <body><main class="shell"><h1>{SITE.title}</h1></main></body>
</html>
```

- [ ] **Step 7: Run foundation checks**

Run:

```powershell
pnpm test -- tests/unit/design-guard.test.ts
pnpm check
pnpm run build
```

Expected: all commands PASS; `dist/index.html`, `dist/sitemap-index.xml`, and `dist/pagefind/pagefind.js` exist.

- [ ] **Step 8: Commit the foundation**

```powershell
git add package.json pnpm-lock.yaml .nvmrc astro.config.mjs tsconfig.json vitest.config.ts scripts src/config src/styles src/pages/index.astro tests/unit/design-guard.test.ts .gitignore
git commit -m "build: bootstrap Astro blog foundation"
```

---

### Task 2: Validate the empty Markdown content collection

**Files:**
- Create: `src/content/schema.ts`
- Create: `src/content.config.ts`
- Create: `src/content/blog/.gitkeep`
- Create: `tests/unit/content-schema.test.ts`

**Interfaces:**
- Produces: `CATEGORIES`, `Category`, `postSchema`, and Astro collection `blog`.
- Consumes: Astro and `astro/zod` installed in Task 1.

- [ ] **Step 1: Write schema tests first**

Create `tests/unit/content-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { postSchema } from '../../src/content/schema';

const valid = {
  title: '测试标题',
  description: '测试摘要',
  publishedAt: '2026-08-18',
  category: 'AI 安全',
  tags: ['提示词注入', '模型安全'],
  draft: true,
};

describe('postSchema', () => {
  it('accepts valid metadata and coerces dates', () => {
    const result = postSchema.parse(valid);
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it('rejects duplicate tags after trimming', () => {
    const result = postSchema.safeParse({ ...valid, tags: ['模型安全', ' 模型安全 '] });
    expect(result.success).toBe(false);
  });

  it('rejects a tag equal to the category', () => {
    const result = postSchema.safeParse({ ...valid, tags: ['AI 安全'] });
    expect(result.success).toBe(false);
  });

  it('rejects updatedAt before publishedAt', () => {
    const result = postSchema.safeParse({ ...valid, updatedAt: '2026-08-17' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown categories', () => {
    const result = postSchema.safeParse({ ...valid, category: '其他' });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run `pnpm test -- tests/unit/content-schema.test.ts`.

Expected: FAIL because `src/content/schema.ts` does not exist.

- [ ] **Step 3: Implement the exact schema and collection loader**

Create `src/content/schema.ts`:

```ts
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
```

Create `src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { postSchema } from './content/schema';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: postSchema,
});

export const collections = { blog };
```

Create the empty file `src/content/blog/.gitkeep`. Do not create any `.md` file.

- [ ] **Step 4: Verify the schema and empty collection**

Run:

```powershell
pnpm test -- tests/unit/content-schema.test.ts
pnpm check
pnpm run build
Get-ChildItem src/content/blog -Filter *.md
```

Expected: tests, check, and build PASS; the last command produces no output.

- [ ] **Step 5: Commit content validation**

```powershell
git add src/content.config.ts src/content/schema.ts src/content/blog/.gitkeep tests/unit/content-schema.test.ts
git commit -m "feat: validate blog content metadata"
```

---

### Task 3: Implement pure post-domain helpers

**Files:**
- Create: `src/lib/posts.ts`
- Create: `tests/unit/posts.test.ts`

**Interfaces:**
- Produces: `getPublishedPosts()`, `filterPublishedPosts()`, `sortPosts()`, `getTaxonomyCounts()`, `paginatePosts()`, `groupPostsByMonth()`, and `getReadingMinutes()`.
- Consumes: `CollectionEntry<'blog'>` and `SITE.postsPerPage`.

- [ ] **Step 1: Write failing domain tests**

Create `tests/unit/posts.test.ts` with a typed metadata factory and assertions:

```ts
import { describe, expect, it } from 'vitest';
import type { CollectionEntry } from 'astro:content';
import {
  filterPublishedPosts,
  getReadingMinutes,
  getTaxonomyCounts,
  groupPostsByMonth,
  paginatePosts,
  sortPosts,
} from '../../src/lib/posts';

type BlogPost = CollectionEntry<'blog'>;

function post(id: string, date: string, draft = false, category = 'AI', tags = ['模型安全']): BlogPost {
  return {
    id,
    collection: 'blog',
    body: '测试文本',
    data: {
      title: id,
      description: '测试摘要',
      publishedAt: new Date(date),
      category,
      tags,
      draft,
    },
  } as BlogPost;
}

describe('post helpers', () => {
  it('removes drafts and future posts', () => {
    const posts = [post('published', '2026-08-01'), post('draft', '2026-08-01', true), post('future', '2026-09-01')];
    expect(filterPublishedPosts(posts, new Date('2026-08-18')).map((item) => item.id)).toEqual(['published']);
  });

  it('sorts newest first with stable id fallback', () => {
    const posts = [post('b', '2026-08-01'), post('a', '2026-08-01'), post('newest', '2026-08-02')];
    expect(sortPosts(posts).map((item) => item.id)).toEqual(['newest', 'a', 'b']);
  });

  it('counts categories and tags', () => {
    const counts = getTaxonomyCounts([post('one', '2026-08-01'), post('two', '2026-08-02', false, 'AI 安全', ['模型安全'])]);
    expect(counts.categories).toEqual([{ name: 'AI', count: 1 }, { name: 'AI 安全', count: 1 }]);
    expect(counts.tags).toEqual([{ name: '模型安全', count: 2 }]);
  });

  it('paginates without inventing pages', () => {
    const result = paginatePosts([post('one', '2026-08-01')], 1, 10);
    expect(result).toMatchObject({ currentPage: 1, totalPages: 1 });
    expect(result.items).toHaveLength(1);
  });

  it('groups by year and month', () => {
    expect(groupPostsByMonth([post('one', '2026-08-01')])[0].key).toBe('2026-08');
  });

  it('returns at least one reading minute', () => {
    expect(getReadingMinutes('短文本')).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run `pnpm test -- tests/unit/posts.test.ts`.

Expected: FAIL because `src/lib/posts.ts` does not exist.

- [ ] **Step 3: Implement the pure helpers and collection wrapper**

Create `src/lib/posts.ts`:

```ts
import { getCollection, type CollectionEntry } from 'astro:content';
import readingTime from 'reading-time';

export type BlogPost = CollectionEntry<'blog'>;
export type TaxonomyCount = { name: string; count: number };

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

export function groupPostsByMonth(posts: readonly BlogPost[]) {
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
```

- [ ] **Step 4: Run domain and full unit tests**

Run:

```powershell
pnpm test -- tests/unit/posts.test.ts
pnpm test
pnpm check
```

Expected: all commands PASS.

- [ ] **Step 5: Commit domain helpers**

```powershell
git add src/lib/posts.ts tests/unit/posts.test.ts
git commit -m "feat: add published post helpers"
```

---

### Task 4: Build the shared shell and persisted light/dark themes

**Files:**
- Create: `playwright.config.ts`
- Create: `src/components/BaseHead.astro`
- Create: `src/components/SiteHeader.astro`
- Create: `src/components/SiteFooter.astro`
- Create: `src/components/ThemeToggle.astro`
- Create: `src/layouts/BaseLayout.astro`
- Create: `tests/e2e/shell.spec.ts`
- Modify: `src/styles/global.css`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Produces: `BaseLayout` props `{ title?: string; description?: string; noindex?: boolean }` and persisted `data-theme` state.
- Consumes: `SITE` and global tokens from Task 1.

- [ ] **Step 1: Configure production-preview Playwright and write failing shell tests**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://127.0.0.1:4321', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm run preview --host 127.0.0.1',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

Create `tests/e2e/shell.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('home has factual metadata and no slogan', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle("Parzival's Lab");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'ParzivalTheGoat 的个人技术博客');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Parzival's Lab");
});

test('theme choice persists across reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '切换深浅主题' }).click();
  const selected = await page.locator('html').getAttribute('data-theme');
  expect(['light', 'dark']).toContain(selected);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', selected as string);
});
```

- [ ] **Step 2: Build the site and verify the shell tests fail**

Run:

```powershell
pnpm exec playwright install chromium
pnpm run build
pnpm test:e2e -- tests/e2e/shell.spec.ts
```

Expected: FAIL because the shared metadata and theme button do not exist.

- [ ] **Step 3: Implement metadata and no-flash theme initialization**

Create `src/components/BaseHead.astro`:

```astro
---
import { SITE } from '../config/site';
interface Props { title?: string; description?: string; noindex?: boolean }
const { title, description = SITE.description, noindex = false } = Astro.props;
const pageTitle = title ? `${title} — ${SITE.title}` : SITE.title;
const canonical = new URL(Astro.url.pathname, SITE.url);
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{pageTitle}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<link rel="alternate" type="application/rss+xml" title={SITE.title} href="/rss.xml" />
{noindex && <meta name="robots" content="noindex" />}
<script is:inline>
  (() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
    } catch {}
  })();
</script>
```

- [ ] **Step 4: Implement flat navigation, footer, theme button, and layout**

Create `src/components/ThemeToggle.astro`:

```astro
<button class="theme-toggle mono" type="button" aria-label="切换深浅主题">主题</button>
<script>
  const button = document.querySelector<HTMLButtonElement>('.theme-toggle');
  button?.addEventListener('click', () => {
    const root = document.documentElement;
    const current = root.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('theme', next);
  });
</script>
```

Create `src/components/SiteHeader.astro`:

```astro
---
import { SITE } from '../config/site';
import ThemeToggle from './ThemeToggle.astro';
const links = [
  { href: '/posts/', label: '文章' },
  { href: '/categories/', label: '分类' },
  { href: '/tags/', label: '标签' },
  { href: '/archive/', label: '归档' },
  { href: '/search/', label: '搜索' },
  { href: '/about/', label: '关于' },
];
---
<header class="site-header">
  <div class="shell header-inner">
    <a class="site-name" href="/">{SITE.title}</a>
    <nav aria-label="主导航"><ul>{links.map((link) => <li><a href={link.href}>{link.label}</a></li>)}</ul></nav>
    <ThemeToggle />
  </div>
</header>
```

Create `src/components/SiteFooter.astro`:

```astro
---
import { SITE } from '../config/site';
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <div class="shell footer-inner mono">
    <span>© {year} {SITE.author}</span>
    <a href={SITE.github} rel="me">GitHub</a>
    <a href="/rss.xml">RSS</a>
  </div>
</footer>
```

Use wrapping horizontal navigation; do not add a mobile drawer.

Create `src/layouts/BaseLayout.astro`:

```astro
---
import BaseHead from '../components/BaseHead.astro';
import SiteFooter from '../components/SiteFooter.astro';
import SiteHeader from '../components/SiteHeader.astro';
import '../styles/global.css';
interface Props { title?: string; description?: string; noindex?: boolean }
const props = Astro.props;
---
<!doctype html>
<html lang="zh-CN">
  <head><BaseHead {...props} /></head>
  <body>
    <SiteHeader />
    <main class="shell" data-pagefind-body><slot /></main>
    <SiteFooter />
  </body>
</html>
```

Replace `src/pages/index.astro` with a `BaseLayout` page containing only `<h1>Parzival's Lab</h1>` at this task.

Extend `global.css` with ruled header/footer styles, square buttons, wrapping navigation, and responsive spacing. Do not declare `border-radius`, a gradient, or any class name containing `card`.

- [ ] **Step 5: Verify theme behavior and design guard**

Run:

```powershell
pnpm run build
pnpm test:e2e -- tests/e2e/shell.spec.ts
pnpm run validate:design
```

Expected: PASS. Refresh preserves the selected theme, and the design guard emits no JSON violations.

- [ ] **Step 6: Commit the shared shell**

```powershell
git add playwright.config.ts src/components src/layouts src/styles/global.css src/pages/index.astro tests/e2e/shell.spec.ts
git commit -m "feat: add editorial shell and themes"
```

---

### Task 5: Build empty-safe lists, taxonomy, archive, and About pages

**Files:**
- Create: `src/components/PostMeta.astro`
- Create: `src/components/PostList.astro`
- Create: `src/components/Pagination.astro`
- Create: `src/pages/posts/index.astro`
- Create: `src/pages/posts/page/[page].astro`
- Create: `src/pages/categories/index.astro`
- Create: `src/pages/categories/[category].astro`
- Create: `src/pages/tags/index.astro`
- Create: `src/pages/tags/[tag].astro`
- Create: `src/pages/archive/index.astro`
- Create: `src/pages/about.astro`
- Create: `tests/e2e/routes.spec.ts`
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: all public list routes and reusable flat `PostList`/`PostMeta`/`Pagination` components.
- Consumes: `getPublishedPosts`, `getTaxonomyCounts`, `paginatePosts`, `groupPostsByMonth`, and `SITE`.

- [ ] **Step 1: Write route and privacy tests before pages exist**

Create the initial `tests/e2e/routes.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

for (const path of ['/', '/posts/', '/categories/', '/categories/AI/', '/tags/', '/archive/', '/about/']) {
  test(`${path} responds`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
  });
}

test('empty site contains no invented posts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('暂无文章')).toBeVisible();
  await expect(page.locator('[data-post-row]')).toHaveCount(0);
});

test('about contains only the public handle and GitHub destination', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByRole('heading', { name: 'ParzivalTheGoat' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/ParzivalTheGoat');
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
});
```

- [ ] **Step 2: Run build and tests to verify missing-route failures**

Run `pnpm run build` and `pnpm test:e2e -- tests/e2e/routes.spec.ts`.

Expected: FAIL on `/posts/`, taxonomy, archive, About, and empty-state assertions.

- [ ] **Step 3: Implement the flat post list and metadata components**

Create `src/components/PostList.astro`:

```astro
---
import type { BlogPost } from '../lib/posts';
import { getReadingMinutes } from '../lib/posts';
interface Props { posts: BlogPost[] }
const { posts } = Astro.props;
---
{posts.length === 0 ? (
  <p class="empty-state">暂无文章</p>
) : (
  <ol class="post-list">
    {posts.map((post) => (
      <li class="post-row" data-post-row>
        <a href={`/posts/${post.id}/`}>{post.data.title}</a>
        <p>{post.data.description}</p>
        <span class="mono muted">{post.data.category} · {getReadingMinutes(post.body ?? '')} 分钟</span>
      </li>
    ))}
  </ol>
)}
```

Create `PostMeta.astro` to render semantic `<time>`, category link, plain tag links, and reading minutes separated by text dots. Create `Pagination.astro` with plain previous/next anchors and `aria-label="分页"`. Neither component may use an enclosing panel.

- [ ] **Step 4: Implement homepage, post pagination, taxonomy, archive, and About routes**

Use this exact homepage structure:

```astro
---
import PostList from '../components/PostList.astro';
import BaseLayout from '../layouts/BaseLayout.astro';
import { getPublishedPosts } from '../lib/posts';
const posts = await getPublishedPosts();
---
<BaseLayout>
  <h1>Parzival's Lab</h1>
  <section aria-labelledby="latest"><h2 id="latest">最新文章</h2><PostList posts={posts.slice(0, 10)} /></section>
</BaseLayout>
```

`/posts/` uses page 1 from `paginatePosts()`. `/posts/page/[page].astro` generates only page numbers `2` through `totalPages`. The category index always lists the six values from `CATEGORIES` with their current counts, and `/categories/[category].astro` generates all six category routes even when their article lists are empty. Tag routes are generated only for tags present on published posts. Archive uses `groupPostsByMonth()` and the same `PostList` rows.

Create `src/pages/about.astro` with only this user content inside `BaseLayout`:

```astro
<h1>ParzivalTheGoat</h1>
<p><a href="https://github.com/ParzivalTheGoat" rel="me">GitHub</a></p>
```

Add flat list CSS using `border-top` and `border-bottom`, wide vertical spacing, and responsive grid columns. Do not introduce a hero subtitle.

- [ ] **Step 5: Verify routes, empty state, privacy, and source constraints**

Run:

```powershell
pnpm check
pnpm test
pnpm run build
pnpm test:e2e -- tests/e2e/routes.spec.ts
pnpm run validate:design
Get-ChildItem src/content/blog -Filter *.md
```

Expected: all automated checks PASS; the final command produces no output.

- [ ] **Step 6: Commit public list routes**

```powershell
git add src/components/PostMeta.astro src/components/PostList.astro src/components/Pagination.astro src/pages src/styles/global.css tests/e2e/routes.spec.ts
git commit -m "feat: add empty-safe blog routes"
```

---

### Task 6: Add article rendering without adding article content

**Files:**
- Create: `src/lib/post-paths.ts`
- Create: `tests/unit/post-paths.test.ts`
- Create: `src/components/TableOfContents.astro`
- Create: `src/layouts/PostLayout.astro`
- Create: `src/pages/posts/[...slug].astro`
- Create: `src/styles/prose.css`

**Interfaces:**
- Produces: `buildPostPaths(posts)` and static article rendering for future user-authored Markdown.
- Consumes: sorted published `BlogPost[]`, Astro `render()`, `PostMeta`, and the shared layout.

- [ ] **Step 1: Write failing path and adjacency tests**

Create `tests/unit/post-paths.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { BlogPost } from '../../src/lib/posts';
import { buildPostPaths } from '../../src/lib/post-paths';

const post = (id: string) => ({ id, collection: 'blog', body: '', data: {} }) as BlogPost;

describe('buildPostPaths', () => {
  it('returns no article routes for an empty blog', () => {
    expect(buildPostPaths([])).toEqual([]);
  });

  it('maps newer and older neighbors from newest-first posts', () => {
    const paths = buildPostPaths([post('new'), post('middle'), post('old')]);
    expect(paths[1].props.newer?.id).toBe('new');
    expect(paths[1].props.older?.id).toBe('old');
  });
});
```

- [ ] **Step 2: Run the unit test and confirm failure**

Run `pnpm test -- tests/unit/post-paths.test.ts`.

Expected: FAIL because `src/lib/post-paths.ts` does not exist.

- [ ] **Step 3: Implement path mapping**

Create `src/lib/post-paths.ts`:

```ts
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
```

- [ ] **Step 4: Implement square-edged article presentation**

Create `src/pages/posts/[...slug].astro`:

```astro
---
import { render } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';
import { buildPostPaths } from '../../lib/post-paths';
import { getPublishedPosts } from '../../lib/posts';
export async function getStaticPaths() { return buildPostPaths(await getPublishedPosts()); }
const { post, newer, older } = Astro.props;
const { Content, headings } = await render(post);
---
<PostLayout post={post} headings={headings} newer={newer} older={older}><Content /></PostLayout>
```

Create `TableOfContents.astro` as a semantic `<nav aria-label="文章目录">` containing heading anchors. Create `PostLayout.astro` with `PostMeta`, a top progress line, the table of contents, `<article class="prose" data-pagefind-body>`, and plain newer/older links separated by a rule.

The article client script must:

1. Update only the width of the top progress line during scroll.
2. Add a square text button labeled `复制` to each `pre` block.
3. Change the label to `已复制` after a successful clipboard write and restore `复制` after two seconds.
4. Skip clipboard enhancement if `navigator.clipboard` is unavailable.

Create `prose.css` with a `44rem` reading width, book-like line height, ruled blockquotes, square solid-color code blocks, and visible heading anchor focus. Do not use backgrounds other than the approved solid theme colors.

- [ ] **Step 5: Verify article infrastructure with zero articles**

Run:

```powershell
pnpm test -- tests/unit/post-paths.test.ts
pnpm check
pnpm run build
pnpm run validate:design
Get-ChildItem dist/posts -Directory | Where-Object { $_.Name -ne 'page' }
```

Expected: tests, type checking, build, and style validation PASS. No generated article-detail file exists because there is no Markdown content.

- [ ] **Step 6: Commit article infrastructure**

```powershell
git add src/lib/post-paths.ts tests/unit/post-paths.test.ts src/components/TableOfContents.astro src/layouts/PostLayout.astro src/pages/posts src/styles/prose.css
git commit -m "feat: add future article rendering"
```

---

### Task 7: Add static search, RSS, sitemap checks, and 404

**Files:**
- Create: `src/components/SearchView.astro`
- Create: `src/pages/search.astro`
- Create: `src/pages/rss.xml.ts`
- Create: `src/pages/404.astro`
- Create: `src/env.d.ts`
- Create: `tests/e2e/search.spec.ts`
- Modify: `tests/e2e/routes.spec.ts`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: production Pagefind search UI, `/rss.xml`, and `/404.html`.
- Consumes: `getPublishedPosts()`, `SITE`, `dist/pagefind/pagefind.js`, and sitemap integration.

- [ ] **Step 1: Write failing RSS, sitemap, 404, and search tests**

Append to `tests/e2e/routes.spec.ts`:

```ts
test('machine-readable routes exist', async ({ request }) => {
  expect((await request.get('/rss.xml')).status()).toBe(200);
  expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
  expect((await request.get('/404.html')).status()).toBe(200);
});
```

Create `tests/e2e/search.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('Pagefind loads and returns a neutral no-result state', async ({ page }) => {
  await page.goto('/search/');
  await page.getByRole('searchbox', { name: '搜索文章' }).fill('不会匹配的随机字符串-7f14');
  await page.getByRole('button', { name: '搜索' }).click();
  await expect(page.getByText('没有找到匹配内容')).toBeVisible();
});
```

- [ ] **Step 2: Run the build and confirm missing-route failures**

Run `pnpm run build` and `pnpm test:e2e -- tests/e2e/routes.spec.ts tests/e2e/search.spec.ts`.

Expected: FAIL because search, RSS, and 404 routes do not exist.

- [ ] **Step 3: Implement RSS and neutral 404**

Create `src/pages/rss.xml.ts`:

```ts
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
```

Create `404.astro` with `BaseLayout title="页面不存在" noindex={true}`, `<h1>页面不存在</h1>`, and one link labeled `返回首页`. Add no explanatory promotional text.

- [ ] **Step 4: Implement Pagefind search without its card-oriented component UI**

Create `SearchView.astro` with a `<form role="search">`, an input labeled `搜索文章`, a submit button labeled `搜索`, and an ordered result list. Use Pagefind's core API rather than `pagefind-ui`:

```astro
<form class="search-form" role="search">
  <label for="query">搜索文章</label>
  <input id="query" name="query" type="search" autocomplete="off" />
  <button type="submit">搜索</button>
</form>
<p class="search-status" aria-live="polite"></p>
<ol class="search-results"></ol>
<script>
  const form = document.querySelector<HTMLFormElement>('.search-form');
  const input = document.querySelector<HTMLInputElement>('#query');
  const status = document.querySelector<HTMLElement>('.search-status');
  const list = document.querySelector<HTMLOListElement>('.search-results');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!input || !status || !list) return;
    const pagefind = await import(/* @vite-ignore */ '/pagefind/pagefind.js');
    const search = await pagefind.search(input.value.trim());
    list.replaceChildren();
    if (search.results.length === 0) {
      status.textContent = '没有找到匹配内容';
      return;
    }
    status.textContent = `${search.results.length} 条结果`;
    for (const result of search.results) {
      const data = await result.data();
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = data.url;
      link.textContent = data.meta.title;
      item.append(link);
      list.append(item);
    }
  });
</script>
```

Create `search.astro` using `BaseLayout title="搜索"` and `<SearchView />`. Create `src/env.d.ts`:

```ts
/// <reference path="../.astro/types.d.ts" />

declare module '/pagefind/pagefind.js' {
  type PagefindData = { url: string; meta: { title: string } };
  type PagefindResult = { data(): Promise<PagefindData> };
  export function search(query: string): Promise<{ results: PagefindResult[] }>;
}
```

Style the search form with an underline or one-pixel square border; search results are ruled list rows, not cards.

- [ ] **Step 5: Verify static services**

Run:

```powershell
pnpm check
pnpm run build
pnpm test:e2e -- tests/e2e/routes.spec.ts tests/e2e/search.spec.ts
pnpm run validate:design
```

Expected: PASS. RSS contains zero `<item>` elements, search loads its Pagefind bundle, and sitemap/404 return 200.

- [ ] **Step 6: Commit static services**

```powershell
git add src/components/SearchView.astro src/pages/search.astro src/pages/rss.xml.ts src/pages/404.astro src/env.d.ts src/styles/global.css tests/e2e/search.spec.ts tests/e2e/routes.spec.ts
git commit -m "feat: add search feeds and error route"
```

---

### Task 8: Complete accessibility, responsive QA, and GitHub Pages workflow

**Files:**
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `.github/workflows/deploy.yml`
- Modify: `package.json` only if verification scripts need correction discovered by the failing tests.

**Interfaces:**
- Produces: release gate `pnpm verify` and a GitHub Pages deployment artifact.
- Consumes: all routes and scripts from Tasks 1–7.

- [ ] **Step 1: Write the final accessibility and responsive tests**

Create `tests/e2e/accessibility.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/posts/', '/categories/', '/tags/', '/archive/', '/search/', '/about/', '/404.html'];

for (const route of routes) {
  test(`${route} has no detectable accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('keyboard focus is visible on main navigation', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus-visible');
  await expect(focused).toBeVisible();
});

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
});

test('reduced motion removes meaningful transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const duration = await page.locator('body').evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(['0s', '0.01ms']).toContain(duration);
});
```

- [ ] **Step 2: Run the full verification and fix only evidence-backed failures**

Run:

```powershell
pnpm verify
```

Expected: the first run may fail on specific accessibility or responsive assertions. Fix only the reported source and rerun until all checks PASS. Do not introduce any new content or visual structure while fixing.

- [ ] **Step 3: Add the official Astro GitHub Pages workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Verify and deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v4
        with:
          version: 11.19.0
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm verify

  build:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: withastro/action@v6
        with:
          node-version: 24
          package-manager: pnpm@11.19.0

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 4: Run release audit**

Run:

```powershell
pnpm verify
git grep -n -E "linear-gradient|radial-gradient|conic-gradient|border-radius|class=.*card" -- src
Get-ChildItem src/content/blog -Filter *.md
git status -sb
```

Expected: `pnpm verify` PASS; both forbidden-pattern and Markdown searches produce no output; only intended workflow/test changes are present.

- [ ] **Step 5: Commit release gates**

```powershell
git add tests/e2e/accessibility.spec.ts .github/workflows/deploy.yml package.json pnpm-lock.yaml
git commit -m "ci: verify and deploy GitHub Pages"
```

---

### Task 9: Create the GitHub repository, enable Pages, and verify production

**Files:**
- No source files should change.

**Interfaces:**
- Produces: public repository `ParzivalTheGoat/ParzivalTheGoat.github.io` and live URL `https://parzivalthegoat.github.io`.
- Consumes: the clean, verified `main` branch and the user's authenticated GitHub session.

- [ ] **Step 1: Confirm the exact publish scope and clean state**

Run:

```powershell
git status -sb
git log --oneline --decorate -10
git remote -v
```

Expected: clean `main`; no unexpected remote; every implementation task has a focused commit.

- [ ] **Step 2: Create the public repository**

Using the authenticated GitHub connector when it exposes repository creation, otherwise the user's authenticated Chrome session, create:

- Owner: `ParzivalTheGoat`
- Repository: `ParzivalTheGoat.github.io`
- Visibility: Public
- Description: `ParzivalTheGoat 的个人技术博客`
- Initialize README: No
- Add `.gitignore`: No
- Add license: No

Do not create a second repository or change the account profile.

- [ ] **Step 3: Add the remote and push `main`**

Run:

```powershell
git remote add origin https://github.com/ParzivalTheGoat/ParzivalTheGoat.github.io.git
git push -u origin main
```

Expected: push succeeds and `origin/main` tracks local `main`.

- [ ] **Step 4: Select GitHub Actions as the Pages source**

In repository Settings → Pages, set Build and deployment Source to `GitHub Actions`. Do not add a custom domain. Verify the `Verify and deploy GitHub Pages` workflow starts for `main`.

- [ ] **Step 5: Wait for the workflow and inspect failures if any**

Wait for the quality, build, and deploy jobs. If one fails, inspect the exact GitHub Actions logs, reproduce the failing command locally, apply the smallest fix through the systematic-debugging workflow, rerun `pnpm verify`, commit, and push.

- [ ] **Step 6: Verify the live site**

Verify all of the following against `https://parzivalthegoat.github.io`:

- HTTP response is 200.
- Page title is `Parzival's Lab`.
- The neutral `暂无文章` state appears.
- About contains only the handle and GitHub link.
- Theme selection survives reload.
- `/rss.xml`, `/sitemap-index.xml`, `/search/`, and `/404.html` load.
- No gradients, rounded borders, card layouts, articles, or slogan text appear.

- [ ] **Step 7: Record final evidence**

Return the repository URL, live site URL, final commit SHA, GitHub Actions result, and local `pnpm verify` result. Do not claim completion until both local verification and live deployment checks pass.
