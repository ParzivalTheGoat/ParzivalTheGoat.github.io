/// <reference path="../.astro/types.d.ts" />

declare namespace PagefindCore {
  type PagefindData = { url: string; meta: { title: string } };
  type PagefindResult = { data(): Promise<PagefindData> };
  type Search = (query: string) => Promise<{ results: PagefindResult[] }>;
}

declare module '/pagefind/pagefind.js' {
  export const search: PagefindCore.Search;
}

declare module '*/pagefind/pagefind.js' {
  export const search: PagefindCore.Search;
}
