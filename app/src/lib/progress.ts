import type { StudyPath } from '@/lib/study-path';

export type DoneKind = 'topic' | 'exercise';

export type DoneRecord = {
  readonly kind: DoneKind;
  readonly itemId: string;
  readonly completedAt: Date;
};

export type DoneIndex = ReadonlyMap<string, Date>;

export type Count = { readonly done: number; readonly total: number };

const keyOf = (kind: DoneKind, id: string) => `${kind}:${id}`;

export const toDoneIndex = (rows: readonly DoneRecord[]): DoneIndex =>
  new Map(rows.map((row) => [keyOf(row.kind, row.itemId), row.completedAt]));

export const isDone = (index: DoneIndex, kind: DoneKind, id: string): boolean =>
  index.has(keyOf(kind, id));

export const doneDate = (index: DoneIndex, kind: DoneKind, id: string): Date | undefined =>
  index.get(keyOf(kind, id));

const count = (kind: DoneKind, ids: readonly string[], index: DoneIndex): Count => ({
  done: ids.filter((id) => isDone(index, kind, id)).length,
  total: ids.length,
});

// Only ids in the current path are counted, so an old mark can never push done above total.
export const summarize = (
  path: Pick<StudyPath, 'topics' | 'exercises'>,
  index: DoneIndex,
): { readonly topics: Count; readonly exercises: Count } => ({
  topics: count(
    'topic',
    path.topics.map((t) => t.id),
    index,
  ),
  exercises: count(
    'exercise',
    path.exercises.map((e) => e.id),
    index,
  ),
});

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// Uses the server's own timezone, which is yours because the app runs on your machine.
export const formatDoneDate = (date: Date): string => dateFormat.format(date);
