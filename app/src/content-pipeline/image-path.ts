// Decides whether an image request path is allowed. The endpoint also checks the real path
// on disk (symlinks) before reading.
import { posix } from 'node:path';

export const IMAGE_FOLDERS = ['images', 'solutions'] as const;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

export const isImageFile = (path: string): boolean =>
  posix.extname(path).toLowerCase() in CONTENT_TYPES;

export const contentTypeFor = (path: string): string | undefined =>
  CONTENT_TYPES[posix.extname(path).toLowerCase()];

function decodeOnce(path: string): string | undefined {
  try {
    return decodeURIComponent(path);
  } catch {
    return undefined;
  }
}

// Returns the repo relative path, or undefined for anything that is not an allowed image path.
export function allowedImagePath(requested: string | undefined): string | undefined {
  if (!requested) return undefined;
  // Astro already decoded the path once; decode again so `%252e%252e` cannot slip through.
  const decoded = decodeOnce(requested);
  if (decoded === undefined || /[\\\0]/.test(decoded) || decoded.includes('..')) return undefined;
  const normalized = posix.normalize(decoded);
  const [folder] = normalized.split('/');
  const inAllowedFolder = IMAGE_FOLDERS.some((allowed) => allowed === folder);
  return inAllowedFolder && !normalized.startsWith('/') && isImageFile(normalized)
    ? normalized
    : undefined;
}
