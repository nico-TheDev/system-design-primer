import { and, desc, eq } from 'drizzle-orm';
import type { PracticeClock } from '@/lib/practice';
import { getDb } from './client';
import { practiceSession } from './schema';

export type PracticeSession = PracticeClock & {
  readonly exerciseId: string;
  readonly step: number;
  readonly revealed: boolean;
  readonly startedAt: number;
};

export type FinishedSession = {
  readonly exerciseId: string;
  readonly finishedAt: number;
  readonly durationMs: number;
};

const isActive = (exerciseId: string) =>
  and(eq(practiceSession.exerciseId, exerciseId), eq(practiceSession.status, 'active'));

export const getActive = (exerciseId: string): PracticeSession | undefined => {
  const row = getDb().select().from(practiceSession).where(isActive(exerciseId)).get();
  return row && { ...row, runningSince: row.runningSince ?? undefined };
};

export const listActiveIds = (): readonly string[] =>
  getDb()
    .select({ exerciseId: practiceSession.exerciseId })
    .from(practiceSession)
    .where(eq(practiceSession.status, 'active'))
    .all()
    .map((row) => row.exerciseId);

const toFinished = (row: {
  exerciseId: string;
  finishedAt: number | null;
  durationMs: number | null;
}): FinishedSession => ({
  exerciseId: row.exerciseId,
  finishedAt: row.finishedAt ?? 0,
  durationMs: row.durationMs ?? 0,
});

// The whole table is a handful of rows per exercise, so every page reads it once.
export const listFinished = (): readonly FinishedSession[] =>
  getDb()
    .select()
    .from(practiceSession)
    .where(eq(practiceSession.status, 'finished'))
    .all()
    .map(toFinished);

export const listFinishedFor = (exerciseId: string): readonly FinishedSession[] =>
  getDb()
    .select()
    .from(practiceSession)
    .where(and(eq(practiceSession.exerciseId, exerciseId), eq(practiceSession.status, 'finished')))
    .orderBy(desc(practiceSession.finishedAt), desc(practiceSession.id))
    .all()
    .map(toFinished);

// The unique index on open sessions makes a second start a no op.
export const startSession = (exerciseId: string, now: number): void => {
  getDb()
    .insert(practiceSession)
    .values({ exerciseId, status: 'active', step: 1, startedAt: now, runningSince: now })
    .onConflictDoNothing()
    .run();
};

export const setStep = (exerciseId: string, step: number): void => {
  getDb().update(practiceSession).set({ step }).where(isActive(exerciseId)).run();
};

export const setClock = (exerciseId: string, clock: PracticeClock): void => {
  getDb()
    .update(practiceSession)
    .set({ elapsedMs: clock.elapsedMs, runningSince: clock.runningSince ?? null })
    .where(isActive(exerciseId))
    .run();
};

export const markRevealed = (exerciseId: string): void => {
  getDb().update(practiceSession).set({ revealed: true }).where(isActive(exerciseId)).run();
};

export const finishSession = (exerciseId: string, durationMs: number, now: number): void => {
  getDb()
    .update(practiceSession)
    .set({
      status: 'finished',
      elapsedMs: durationMs,
      runningSince: null,
      finishedAt: now,
      durationMs,
    })
    .where(isActive(exerciseId))
    .run();
};

export const discardSession = (exerciseId: string): void => {
  getDb().delete(practiceSession).where(isActive(exerciseId)).run();
};
