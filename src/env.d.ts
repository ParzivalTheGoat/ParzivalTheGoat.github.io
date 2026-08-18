/// <reference path="../.astro/types.d.ts" />

declare module '/pagefind/pagefind.js' {
  type PagefindData = { url: string; meta: { title: string } };
  type PagefindResult = { data(): Promise<PagefindData> };
  export function search(query: string): Promise<{ results: PagefindResult[] }>;
}
