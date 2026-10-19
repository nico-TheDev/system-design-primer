// Turns a Jupyter notebook into one markdown text. Code is read as text and never run.
import { failure, type Notice } from './types';

type Cell = { readonly type: string; readonly source: string };

export type NotebookResult =
  | { readonly ok: true; readonly markdown: string }
  | { readonly ok: false; readonly notice: Notice };

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCell(value: unknown): Cell | undefined {
  if (!isRecord(value) || typeof value.cell_type !== 'string') return undefined;
  const { source } = value;
  if (typeof source === 'string') return { type: value.cell_type, source };
  if (Array.isArray(source) && source.every((line) => typeof line === 'string')) {
    return { type: value.cell_type, source: source.join('') };
  }
  return undefined;
}

// A fence longer than any backtick run inside the code, so the code cannot close it early.
function fenceFor(code: string): string {
  const longest = Math.max(0, ...Array.from(code.matchAll(/`+/g), (match) => match[0].length));
  return '`'.repeat(Math.max(3, longest + 1));
}

function codeBlock(source: string): string {
  const code = source.replace(/^%%writefile[^\n]*\n?/, '').trimEnd();
  const fence = fenceFor(code);
  return `${fence}python\n${code}\n${fence}`;
}

export function notebookToMarkdown(path: string, raw: string): NotebookResult {
  const parsed = ((): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  })();
  const cells = isRecord(parsed) && Array.isArray(parsed.cells) ? parsed.cells : undefined;
  if (!cells) return { ok: false, notice: failure(`${path} is not a valid notebook, skipped`) };

  const all = cells.flatMap((cell) => readCell(cell) ?? []);
  // The attribution cell sits before the `# title` cell and is dropped.
  const titleAt = all.findIndex(({ type, source }) => type === 'markdown' && /^#\s/.test(source));
  const kept = titleAt === -1 ? all : all.slice(titleAt);
  const blocks = kept.flatMap(({ type, source }) => {
    if (source.trim() === '') return [];
    if (type === 'markdown') return [source.trim()];
    if (type === 'code') return [codeBlock(source)];
    return [];
  });
  return { ok: true, markdown: blocks.join('\n\n') };
}
