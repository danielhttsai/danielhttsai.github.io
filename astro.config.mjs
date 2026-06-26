// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Personal site, deployed to a GitHub Pages *user* site:
//   https://danielhttsai.github.io/   (repo: danielhttsai.github.io)
// User sites serve from the domain root, so the base path is '/'.
export default defineConfig({
  site: 'https://danielhttsai.github.io',
  base: '/',
  trailingSlash: 'ignore',
  integrations: [
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
