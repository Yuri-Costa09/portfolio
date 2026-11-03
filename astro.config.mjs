import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { wikilinks } from './src/lib/wikilinks.mjs';

// Production domain (GitHub Pages custom domain).
export default defineConfig({
  site: 'https://yuricosta.dev',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [wikilinks],
    shikiConfig: { theme: 'vesper', wrap: false },
  },
});
