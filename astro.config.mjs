import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://parzivalthegoat.github.io',
  integrations: [sitemap()],
  trailingSlash: 'always',
});
