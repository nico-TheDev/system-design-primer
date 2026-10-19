// WCAG contrast check for spec 0002 (AC-3). Run from app/: node scripts/contrast.mjs
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/tokens.css', 'utf8');
const tokens = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*light-dark\(\s*(#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\s*\)/g)].map(
    (m) => [m[1], { light: m[2], dark: m[3] }],
  ),
);

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground token, background token, minimum]
const pairs = [
  ['ink', 'paper', 4.5],
  ['ink', 'paper-raised', 4.5],
  ['ink-soft', 'paper', 4.5],
  ['ink-soft', 'paper-raised', 4.5],
  ['ink-faint', 'paper', 4.5],
  ['ink-faint', 'paper-raised', 4.5],
  ['accent', 'paper', 4.5],
  ['accent', 'paper-raised', 4.5],
  ['caution', 'paper', 4.5],
  ['caution', 'paper-raised', 4.5],
  ['done', 'paper', 4.5],
  ['done', 'paper-raised', 4.5],
  ['rule-strong', 'paper', 3],
  ['rule-strong', 'paper-raised', 3],
  ['ink', 'accent-wash', 4.5],
  ['accent', 'accent-wash', 4.5],
  ['on-accent', 'accent', 4.5],
];

let failed = 0;
const report = (label, theme, r, min) => {
  const ok = r >= min;
  if (!ok) failed += 1;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${theme.padEnd(5)} ${label.padEnd(36)} ${r.toFixed(2)} (min ${min})`,
  );
};

for (const theme of ['light', 'dark']) {
  for (const [fg, bg, min] of pairs)
    report(`${fg} on ${bg}`, theme, ratio(tokens[fg][theme], tokens[bg][theme]), min);
  // Focus ring is the accent on both papers (3:1).
  for (const bg of ['paper', 'paper-raised'])
    report(
      `focus ring (accent) on ${bg}`,
      theme,
      ratio(tokens.accent[theme], tokens[bg][theme]),
      3,
    );
}

// Shiki colors against the code background (paper-raised), using the patched themes.
// Diff and "ignored" scopes only paint backgrounds or markup, never code text, so they are skipped.
const { shikiConfig } = await import('../src/lib/shiki.ts');
const skip = /markup\.ignored|markup\.untracked|carriage-return/;
for (const theme of ['light', 'dark']) {
  const t = shikiConfig.themes[theme];
  const colors = new Map();
  for (const s of t.tokenColors ?? t.settings ?? []) {
    const fg = s.settings?.foreground;
    const scope = (s.scope ?? ['default']).toString();
    if (fg && /^#[0-9a-f]{6}$/i.test(fg) && !skip.test(scope))
      colors.set(fg.toLowerCase(), scope.slice(0, 28));
  }
  const base = t.colors?.['editor.foreground'];
  if (base) colors.set(base.toLowerCase(), 'editor.foreground');
  for (const [hex, scope] of colors)
    report(`shiki ${hex} ${scope}`, theme, ratio(hex, tokens['paper-raised'][theme]), 4.5);
}

console.log(failed ? `\n${failed} pair(s) failed` : '\nAll pairs pass');
process.exit(failed ? 1 : 0);
