import type { ExerciseKind } from '@/content-pipeline/types';
import type { Count } from '@/lib/progress';
import type { StudyPath } from '@/lib/study-path';

export const PRACTICE_TARGET_MS = 45 * 60 * 1000;
// One running stretch counts at most this long, so a forgotten tab cannot inflate an attempt.
export const PRACTICE_STRETCH_CAP_MS = 3 * 60 * 60 * 1000;
export const PRACTICE_STEP_COUNT = 4;

export type PracticeStep = { readonly title: string; readonly prompt: string };

export const PRACTICE_STEPS: Readonly<Record<ExerciseKind, readonly PracticeStep[]>> = {
  'system-design': [
    {
      title: 'Outline use cases, constraints and assumptions',
      prompt:
        'Say who uses the system and what they do, then list the limits and estimate the load.',
    },
    {
      title: 'Create a high level design',
      prompt: 'Sketch the main parts and follow one request through them.',
    },
    {
      title: 'Design core components',
      prompt: 'Pick the key parts and work out their data model, API and algorithms.',
    },
    {
      title: 'Scale the design',
      prompt: 'Find the bottlenecks and remove them with caching, replication or sharding.',
    },
  ],
  'object-oriented': [
    {
      title: 'Clarify the requirements',
      prompt: 'Ask what the system must do and what is out of scope.',
    },
    {
      title: 'Sketch the classes and their relationships',
      prompt: 'List the main classes and show how they connect.',
    },
    {
      title: 'Define the key methods',
      prompt: 'Write the methods that carry the main use cases.',
    },
    {
      title: 'Test edge cases and extend',
      prompt: 'Walk through odd inputs, then say how the design would grow.',
    },
  ],
};

// The part of a session that decides the stopwatch. Times are epoch milliseconds.
export type PracticeClock = {
  readonly elapsedMs: number;
  readonly runningSince: number | undefined;
};

export const isStretchCapped = (clock: PracticeClock, now: number): boolean =>
  clock.runningSince !== undefined && now - clock.runningSince >= PRACTICE_STRETCH_CAP_MS;

// Running means the clock is ticking. A capped stretch has stopped, whatever the row says.
export const isRunning = (clock: PracticeClock, now: number): boolean =>
  clock.runningSince !== undefined && !isStretchCapped(clock, now);

// Used on read and on write, so the cap applies the same everywhere.
export const elapsedAt = (clock: PracticeClock, now: number): number =>
  clock.elapsedMs +
  (clock.runningSince === undefined
    ? 0
    : Math.min(Math.max(now - clock.runningSince, 0), PRACTICE_STRETCH_CAP_MS));

// The wanted end state, never a toggle: repeating a request changes nothing.
export const withRunning = (clock: PracticeClock, running: boolean, now: number): PracticeClock => {
  if (running) {
    return isRunning(clock, now) ? clock : { elapsedMs: elapsedAt(clock, now), runningSince: now };
  }
  return clock.runningSince === undefined
    ? clock
    : { elapsedMs: elapsedAt(clock, now), runningSince: undefined };
};

export const formatClock = (ms: number): string => {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
};

export type FinishedAttempt = { readonly exerciseId: string };

// Finished attempts per exercise, and which exercises have an open session.
export type PracticeIndex = {
  readonly finished: ReadonlyMap<string, number>;
  readonly open: ReadonlySet<string>;
};

export const emptyPracticeIndex: PracticeIndex = { finished: new Map(), open: new Set() };

export const toPracticeIndex = (
  finished: readonly FinishedAttempt[],
  openIds: readonly string[],
): PracticeIndex => ({
  finished: finished.reduce(
    (counts, row) => new Map(counts).set(row.exerciseId, (counts.get(row.exerciseId) ?? 0) + 1),
    new Map<string, number>(),
  ),
  open: new Set(openIds),
});

// Counts only exercises in the current path, so a removed exercise never pushes practiced above total.
export const summarizePracticed = (path: Pick<StudyPath, 'exercises'>): Count => ({
  done: path.exercises.filter((e) => e.practiced > 0).length,
  total: path.exercises.length,
});
