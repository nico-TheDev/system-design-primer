import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

// Spec 0001 boundary: only src/db/ talks to the database.
const dbPackages = [
  { name: 'better-sqlite3', message: 'Only src/db/ may touch the database.' },
  { name: 'drizzle-orm', message: 'Only src/db/ may touch the database.' },
];
const dbPatterns = [{ group: ['drizzle-orm/*'], message: 'Only src/db/ may touch the database.' }];

export default defineConfig(
  { ignores: ['dist/', '.astro/', 'node_modules/', 'drizzle/', 'data/', 'public/'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true } },
  },
  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { project: true, extraFileExtensions: ['.astro'] } },
  },
  ...astro.configs['jsx-a11y-recommended'],
  {
    files: ['**/*.tsx'],
    extends: [jsxA11y.flatConfigs.recommended, reactHooks.configs.flat.recommended],
  },
  {
    files: ['**/*.{ts,tsx,astro}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx,astro}'],
    ignores: ['src/db/**'],
    rules: { 'no-restricted-imports': ['error', { paths: dbPackages, patterns: dbPatterns }] },
  },
  {
    files: ['src/components/islands/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: dbPackages,
          patterns: [
            ...dbPatterns,
            {
              group: ['@/db', '@/db/*', '**/db', '**/db/*'],
              message: 'Islands reach the server only through astro:actions.',
            },
          ],
        },
      ],
    },
  },
  // Astro templates (JSX expressions) resolve to an error type in typescript-eslint, so these two rules only produce noise there.
  {
    files: ['**/*.astro'],
    rules: {
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  { files: ['scripts/**'], languageOptions: { globals: globals.node } },
  // Config files skip the type aware rules.
  { files: ['*.config.*'], extends: [tseslint.configs.disableTypeChecked] },
  prettier,
);
