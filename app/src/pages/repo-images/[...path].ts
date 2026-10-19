// Serves repo images (`images/` and `solutions/`) to the study pages. Read only, allow listed.
import { readFile, realpath } from 'node:fs/promises';
import { join, sep } from 'node:path';
import type { APIRoute } from 'astro';
import { allowedImagePath, contentTypeFor, IMAGE_FOLDERS } from '@/content-pipeline/image-path';
import { REPO_ROOT } from '@/content-pipeline/repo-root';

const notFound = (): Response => new Response(null, { status: 404 });

export const GET: APIRoute = async ({ params }) => {
  const relativePath = allowedImagePath(params.path);
  const type = relativePath === undefined ? undefined : contentTypeFor(relativePath);
  if (relativePath === undefined || type === undefined) return notFound();
  try {
    // Follow symlinks first, then require the real file to sit inside an allowed folder.
    const real = await realpath(join(REPO_ROOT, relativePath));
    const roots = await Promise.all(
      IMAGE_FOLDERS.map((folder) => realpath(join(REPO_ROOT, folder))),
    );
    if (!roots.some((root) => real.startsWith(root + sep))) return notFound();
    return new Response(await readFile(real), {
      headers: {
        'Content-Type': type,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'",
      },
    });
  } catch {
    return notFound();
  }
};
