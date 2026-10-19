import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// One row means done. No foreign key: content ids come from the markdown, not from the database.
export const progress = sqliteTable(
  'progress',
  {
    kind: text('kind', { enum: ['topic', 'exercise'] }).notNull(),
    itemId: text('item_id').notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.itemId] })],
);

export type ProgressKind = (typeof progress.kind.enumValues)[number];
