import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { wikilinks } from './src/lib/wikilinks.mjs';

// Change `site` to your real domain before deploying.
export default defineConfig({
  site: 'https://yuri.dev',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [wikilinks],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },
  },
});
