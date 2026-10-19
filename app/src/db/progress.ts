import { and, eq } from 'drizzle-orm';
import { getDb } from './client';
import { progress, type ProgressKind } from './schema';

export type DoneRow = {
  readonly kind: ProgressKind;
  readonly itemId: string;
  readonly completedAt: Date;
};

// The whole table is a few dozen rows at most, so every page reads it once.
export const listDone = (): readonly DoneRow[] => getDb().select().from(progress).all();

// A repeat keeps the first row, so the first completion date stays.
export const setDone = (kind: ProgressKind, itemId: string): void => {
  getDb()
    .insert(progress)
    .values({ kind, itemId, completedAt: new Date() })
    .onConflictDoNothing()
    .run();
};

export const unsetDone = (kind: ProgressKind, itemId: string): void => {
  getDb()
    .delete(progress)
    .where(and(eq(progress.kind, kind), eq(progress.itemId, itemId)))
    .run();
};
