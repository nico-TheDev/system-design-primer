// Tailwind plugin must stay last in `plugins`.
/** @type {import('prettier').Config} */
export default {
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/styles/global.css',
  overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
};
