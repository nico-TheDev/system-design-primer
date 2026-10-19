import { and, count, desc, eq, gte, isNull } from 'drizzle-orm';
import type { Schedule } from '@/lib/flashcards-queue';
import { getDb } from './client';
import { cardState, reviewLog } from './schema';

export type SavedCard = {
  readonly deck: string;
  readonly guid: string;
  readonly schedule: Schedule;
};

type Row = typeof cardState.$inferSelect;

const toSchedule = (row: Row): Schedule => ({
  due: row.due,
  stability: row.stability,
  difficulty: row.difficulty,
  state: row.state as Schedule['state'],
  reps: row.reps,
  lapses: row.lapses,
  learningSteps: row.learningSteps,
  scheduledDays: row.scheduledDays,
  lastReview: row.lastReview,
});

const sameCard = (deck: string, guid: string) =>
  and(eq(cardState.deck, deck), eq(cardState.guid, guid));

// At most 56 rows, so every page reads them all.
export const listSaved = (): readonly SavedCard[] =>
  getDb()
    .select()
    .from(cardState)
    .all()
    .map((row) => ({ deck: row.deck, guid: row.guid, schedule: toSchedule(row) }));

// Ratings that started a card, since the given time: this is how many new cards today were used.
export const countNewSince = (since: number): number =>
  getDb()
    .select({ total: count() })
    .from(reviewLog)
    .where(and(isNull(reviewLog.previousState), gte(reviewLog.reviewedAt, since)))
    .get()?.total ?? 0;

// Reads the row, computes, writes the new row and the log row in one synchronous transaction.
export const applyRating = (
  deck: string,
  guid: string,
  rating: number,
  now: number,
  schedule: (current: Schedule | undefined) => Schedule,
): { readonly logId: number; readonly schedule: Schedule } =>
  getDb().transaction((tx) => {
    const row = tx.select().from(cardState).where(sameCard(deck, guid)).get();
    const current = row && toSchedule(row);
    const next = schedule(current);
    tx.insert(cardState)
      .values({ deck, guid, ...next })
      .onConflictDoUpdate({ target: [cardState.deck, cardState.guid], set: next })
      .run();
    const log = tx
      .insert(reviewLog)
      .values({
        deck,
        guid,
        rating,
        reviewedAt: now,
        previousState: current ? JSON.stringify(current) : null,
      })
      .returning({ id: reviewLog.id })
      .get();
    return { logId: log.id, schedule: next };
  });

export type Undone = {
  readonly deck: string;
  readonly guid: string;
  // Undefined when the card is new again.
  readonly schedule: Schedule | undefined;
};

// Succeeds only when `logId` is the newest rating: restores the schedule before it and removes the log row.
export const undoNewest = (logId: number): Undone | undefined =>
  getDb().transaction((tx) => {
    const newest = tx.select().from(reviewLog).orderBy(desc(reviewLog.id)).limit(1).get();
    if (!newest || newest.id !== logId) return undefined;
    const previous = newest.previousState
      ? (JSON.parse(newest.previousState) as Schedule)
      : undefined;
    if (previous) {
      tx.update(cardState).set(previous).where(sameCard(newest.deck, newest.guid)).run();
    } else {
      tx.delete(cardState).where(sameCard(newest.deck, newest.guid)).run();
    }
    tx.delete(reviewLog).where(eq(reviewLog.id, newest.id)).run();
    return { deck: newest.deck, guid: newest.guid, schedule: previous };
  });
