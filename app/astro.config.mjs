// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { shikiConfig } from './src/lib/shiki.ts';

// Localhost only, on purpose. Never pass --host or widen allowedHosts (see docs/specs/0001).
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  server: { host: 'localhost', port: 4321 },
  markdown: { shikiConfig },
  // Self hosted at build by the Fonts API (spec 0004). Variable weight ranges, latin only.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Literata',
      cssVariable: '--font-literata',
      weights: ['400 700'],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Hanken Grotesk',
      cssVariable: '--font-hanken',
      weights: ['400 600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    server: { strictPort: true },
    ssr: { external: ['better-sqlite3'] },
  },
});
