# Task 5 Report: Empty-safe public routes

## Implementation

- Added flat `PostList`, `PostMeta`, and `Pagination` components. `PostList` renders the exact empty state `暂无文章`; `PostMeta` provides semantic published dates, category links, plain tag links, and reading minutes.
- Added the article-list, page-2-and-later, category, tag, archive, and About static routes.
- Homepage now has only the site title and a `最新文章` region, with no subtitle or slogan.
- Category index and static category pages use all six `CATEGORIES` values even with no posts. Tag static paths derive only from published-post tags. Later pagination paths are generated only from page 2 through the available total.
- Added ruled, responsive list/taxonomy/pagination CSS. No panels, cards, rounded borders, gradients, or mobile drawer were added.

## TDD evidence

### RED

1. Created `tests/e2e/routes.spec.ts` before adding Task 5 production routes/components. It covers public route responses, all six empty category pages, homepage latest-post region and empty state, category totals, absent page-2/tag-detail paths, and About privacy.
2. Ran bundled Node 24/pnpm 11 commands:

   ```powershell
   pnpm run build
   pnpm test:e2e -- tests/e2e/routes.spec.ts
   ```

   Build exited 0 because Astro can build the pre-existing homepage without the new routes. The prescribed Playwright invocation failed as expected: 14 Task 5 assertions failed and 5 existing/negative-path assertions passed. Failures were missing `/posts/`, taxonomy, archive, About, all category static paths, the homepage latest-post region, and category rows.

### GREEN

1. Implemented only the components, routes, homepage markup, and styles needed by the RED assertions.
2. Ran `pnpm check`: `Result (33 files): 0 errors, 0 warnings, 0 hints`.
3. Ran `pnpm run build`: static build completed with 12 pages; Pagefind indexed 12 pages; design validation exited 0.
4. Ran focused route verification:

   ```powershell
   pnpm exec playwright test tests/e2e/routes.spec.ts
   ```

   Result: `16 passed`.
5. The first GREEN route run exposed a test-only strict-selector issue because the shared footer has a second legitimate GitHub link. The About assertion was narrowed to `main`; no production behavior changed. The rerun passed 16/16.

## Final verification

All commands used the bundled Node `v24.19.0` and pnpm `11.19.0`.

```powershell
pnpm check
pnpm test
pnpm run build
pnpm test:e2e -- tests/e2e/routes.spec.ts
pnpm run validate:design
Get-ChildItem src/content/blog -Filter *.md
```

Results:

- `pnpm check`: 0 errors, 0 warnings, 0 hints.
- `pnpm test`: 3 files and 21 tests passed.
- `pnpm run build`: 12 static pages built; Pagefind completed; design validation passed.
- Prescribed Playwright invocation: 19 tests passed (the script also includes the existing shell tests).
- Direct focused route suite: 16 tests passed.
- `pnpm run validate:design`: passed.
- Markdown-content check: no `*.md` files in `src/content/blog`.
- Source scan found no gradients, `border-radius`, or card patterns in `src`.

Astro logs an expected empty-glob warning for `src/content/blog`; the intentionally empty collection still builds successfully.

## Files

- Created: `src/components/PostMeta.astro`
- Created: `src/components/PostList.astro`
- Created: `src/components/Pagination.astro`
- Created: `src/pages/posts/index.astro`
- Created: `src/pages/posts/page/[page].astro`
- Created: `src/pages/categories/index.astro`
- Created: `src/pages/categories/[category].astro`
- Created: `src/pages/tags/index.astro`
- Created: `src/pages/tags/[tag].astro`
- Created: `src/pages/archive/index.astro`
- Created: `src/pages/about.astro`
- Created: `tests/e2e/routes.spec.ts`
- Modified: `src/pages/index.astro`
- Modified: `src/styles/global.css`
- Created: `.superpowers/sdd/2026-08-18-personal-technical-blog/task-5-report.md`

## Self-review

- Confirmed all six category routes are generated even when their post lists are empty.
- Confirmed empty tag data generates no tag detail paths and empty pagination generates no `/posts/page/2/` path.
- Confirmed each post region delegates its empty state to `PostList`, preserving the exact required text.
- Confirmed About's main content is only the handle and exact GitHub link; no email or invented profile content is present.
- Confirmed styles use rules, typography, whitespace, and responsive columns without restricted visual patterns.
- Removed generated Playwright `test-results` before staging.

## Concerns

No implementation concerns. Astro's empty-content glob warning is expected for this deliberately post-free task state.
