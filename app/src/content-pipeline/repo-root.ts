import { resolve } from 'node:path';

// The repo root is the parent of the app folder. Paths resolve from the app working directory
// (spec 0001), so every script runs from `app/`.
export const REPO_ROOT = resolve(process.cwd(), '..');
