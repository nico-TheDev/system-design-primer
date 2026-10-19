// Reads the repo's README and solutions in place. This is the only file access of the pipeline,
// and it only reads: nothing here writes, renames or deletes.
import { readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import type { ExerciseSource, RepoSources } from './build-content';
import { isImageFile } from './image-path';
import { REPO_ROOT } from './repo-root';
import { failure, warn, type Notice } from './types';

const README = join(REPO_ROOT, 'README.md');
const SYSTEM_DESIGN = 'solutions/system_design';
const OBJECT_ORIENTED = 'solutions/object_oriented_design';

const normalize = (text: string): string => text.replace(/\r\n/g, '\n');
const isHidden = (name: string): boolean => name.startsWith('.');

async function folders(dir: string): Promise<readonly string[]> {
  const entries = await readdir(join(REPO_ROOT, dir), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !isHidden(entry.name))
    .map((entry) => entry.name)
    .sort();
}

type Read = { readonly source?: ExerciseSource; readonly notices: readonly Notice[] };

async function readFileOrNotice(
  dir: string,
  id: string,
  file: string,
  level: 'warn' | 'error',
): Promise<Read> {
  const path = posix.join(dir, file);
  try {
    const text = normalize(await readFile(join(REPO_ROOT, path), 'utf-8'));
    return { source: { id, dir, path, text }, notices: [] };
  } catch {
    const message = `could not read ${path}, skipped`;
    return { notices: [level === 'warn' ? warn(message) : failure(message)] };
  }
}

async function readSystemDesign(): Promise<readonly Read[]> {
  const names = (await folders(SYSTEM_DESIGN)).filter((name) => name !== 'template');
  return Promise.all(
    names.map((name) =>
      readFileOrNotice(posix.join(SYSTEM_DESIGN, name), name, 'README.md', 'warn'),
    ),
  );
}

async function readObjectOriented(): Promise<readonly Read[]> {
  const names = await folders(OBJECT_ORIENTED);
  return Promise.all(
    names.map(async (name): Promise<Read> => {
      const dir = posix.join(OBJECT_ORIENTED, name);
      const files = (await readdir(join(REPO_ROOT, dir)))
        .filter((file) => file.endsWith('.ipynb') && !isHidden(file))
        .sort();
      const [first, ...rest] = files;
      if (first === undefined) return { notices: [warn(`${dir} has no notebook, skipped`)] };
      const read = await readFileOrNotice(dir, name, first, 'error');
      const extra =
        rest.length > 0 ? [warn(`${dir} has more than one notebook, using ${first}`)] : [];
      return { ...read, notices: [...read.notices, ...extra] };
    }),
  );
}

async function listImages(dir: string): Promise<readonly string[]> {
  const entries = await readdir(join(REPO_ROOT, dir), { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && isImageFile(entry.name))
    .map((entry) =>
      posix.join(dir, posix.relative(join(REPO_ROOT, dir), join(entry.parentPath, entry.name))),
    );
}

// Throws when the README or the solutions listing cannot be read at all.
export async function readRepo(): Promise<RepoSources> {
  const [readme, systemDesign, objectOriented, images, solutionImages] = await Promise.all([
    readFile(README, 'utf-8'),
    readSystemDesign(),
    readObjectOriented(),
    listImages('images'),
    listImages('solutions'),
  ]);
  const reads = [...systemDesign, ...objectOriented];
  const sourcesOf = (items: readonly Read[]): readonly ExerciseSource[] =>
    items.flatMap(({ source }) => (source ? [source] : []));
  return {
    readme: normalize(readme),
    systemDesign: sourcesOf(systemDesign),
    objectOriented: sourcesOf(objectOriented),
    imageFiles: [...images, ...solutionImages],
    notices: reads.flatMap(({ notices }) => notices),
  };
}
