import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { ShikiConfig } from 'astro';

// One Shiki config for every code block (markdown, <Code>, the content loader).
// defaultColor false writes both themes as CSS variables; prose.css picks with light-dark().

// Stock colors that miss 4.5:1 on the code background (checked by scripts/contrast.mjs),
// and what replaces them. CSS cannot reach Shiki scopes, so the theme JSON is patched here.
const fixes = {
  'github-light': {
    '#d73a49': '#c0283a',
    '#22863a': '#1c7632',
    '#e36209': '#a84703',
  },
  'github-dark-dimmed': {
    '#768390': '#8b98a5',
  },
} as const;

type ThemeName = keyof typeof fixes;

// Shiki is not a direct dependency (Astro owns it), so resolve it through Astro.
const shikiUrl = pathToFileURL(
  createRequire(createRequire(import.meta.url).resolve('astro/package.json')).resolve('shiki'),
).href;
const { bundledThemes } = (await import(shikiUrl)) as {
  bundledThemes: Record<string, () => Promise<{ default: Record<string, unknown> }>>;
};

const patched = async (name: ThemeName) => {
  const theme = (await bundledThemes[name]!()).default;
  const map: Record<string, string> = fixes[name];
  const swap = (v: unknown): unknown =>
    typeof v === 'string'
      ? (map[v.toLowerCase()] ?? v)
      : Array.isArray(v)
        ? v.map(swap)
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]))
          : v;
  return swap(theme) as never;
};

export const shikiConfig: ShikiConfig = {
  themes: { light: await patched('github-light'), dark: await patched('github-dark-dimmed') },
  defaultColor: false,
  wrap: false,
};
