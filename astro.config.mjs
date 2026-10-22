import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://parzivalthegoat.github.io',
  integrations: [sitemap()],
  trailingSlash: 'always',
  markdown: {
    // Colours come from the palette in src/styles/prose.css.
    shikiConfig: { theme: 'css-variables' },
  },
});
