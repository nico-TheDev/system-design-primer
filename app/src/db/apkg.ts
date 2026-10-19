// Reads one Anki `.apkg` deck in place. It lives in src/db because it opens the deck's embedded
// SQLite file, and only this folder may import better-sqlite3. Nothing here writes to disk.
import { readFile } from 'node:fs/promises';
import Database from 'better-sqlite3';
import { unzipSync } from 'fflate';

export type RawNote = {
  readonly id: number;
  readonly guid: string;
  // Exactly two fields, front then back, as Anki stored them.
  readonly fields: readonly [string, string];
};

export type RawDeck = {
  // The deck's own name, or undefined when the file only has the Default deck.
  readonly name: string | undefined;
  readonly notes: readonly RawNote[];
  // Notes that could not be used, one message each.
  readonly skipped: readonly string[];
};

const FIELD_SEPARATOR = '\x1f';

type Row = {
  readonly id: number;
  readonly guid: string;
  readonly mid: number;
  readonly flds: string;
};

const parseJson = (text: string): Record<string, { name?: unknown; flds?: unknown }> => {
  const value: unknown = JSON.parse(text);
  return typeof value === 'object' && value !== null ? (value as never) : {};
};

const pickDatabase = (files: Record<string, Uint8Array>): Uint8Array => {
  const modern = files['collection.anki21'];
  const legacy = files['collection.anki2'];
  const found = modern ?? legacy;
  if (found) return found;
  if (files['collection.anki21b']) {
    throw new Error('this deck uses the newer .anki21b format, which is not supported');
  }
  throw new Error('no collection database inside the deck');
};

// Throws when the file is missing, corrupt or in an unsupported format; the caller keeps the last good cards.
export async function readApkg(path: string): Promise<RawDeck> {
  const files = unzipSync(new Uint8Array(await readFile(path)));
  const bytes = pickDatabase(files);
  const db = new Database(Buffer.from(bytes));
  try {
    const col = db.prepare('select decks, models from col').get() as
      { decks: string; models: string } | undefined;
    if (!col) throw new Error('the deck has no collection row');
    const decks = Object.values(parseJson(col.decks));
    const name = decks
      .map((deck) => deck.name)
      .find((n) => typeof n === 'string' && n !== 'Default');
    const models = parseJson(col.models);
    const rows = db
      .prepare('select id, guid, mid, flds from notes order by id')
      .all() as readonly Row[];

    const seen = new Set<string>();
    const notes: RawNote[] = [];
    const skipped: string[] = [];
    rows.forEach((row) => {
      const fieldCount = Array.isArray(models[String(row.mid)]?.flds)
        ? (models[String(row.mid)]?.flds as unknown[]).length
        : 0;
      const parts = row.flds.split(FIELD_SEPARATOR);
      const [front, back] = parts;
      if (fieldCount !== 2 || parts.length !== 2 || front === undefined || back === undefined) {
        skipped.push(`note ${row.id} is not a two field Basic note`);
      } else if (seen.has(row.guid)) {
        skipped.push(`note ${row.id} repeats guid ${row.guid}`);
      } else {
        seen.add(row.guid);
        notes.push({ id: row.id, guid: row.guid, fields: [front, back] });
      }
    });
    return {
      name: typeof name === 'string' ? name : undefined,
      notes,
      skipped,
    };
  } finally {
    db.close();
  }
}
