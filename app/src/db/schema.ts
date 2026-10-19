import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

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

// One row per practice attempt. No foreign key: exercise ids come from folder names, not from the database.
// Times are epoch milliseconds so the clock maths needs no date conversion.
export const practiceSession = sqliteTable(
  'practice_session',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    exerciseId: text('exercise_id').notNull(),
    status: text('status', { enum: ['active', 'finished'] }).notNull(),
    step: integer('step').notNull(),
    revealed: integer('revealed', { mode: 'boolean' }).notNull().default(false),
    elapsedMs: integer('elapsed_ms').notNull().default(0),
    runningSince: integer('running_since'),
    startedAt: integer('started_at').notNull(),
    finishedAt: integer('finished_at'),
    durationMs: integer('duration_ms'),
  },
  (t) => [
    check('practice_session_step_range', sql`${t.step} between 1 and 4`),
    // At most one open session per exercise.
    uniqueIndex('practice_session_one_active')
      .on(t.exerciseId)
      .where(sql`${t.status} = 'active'`),
    index('practice_session_exercise').on(t.exerciseId),
  ],
);

// One row per flashcard rated at least once (spec 0008). No foreign key: cards live in the deck files, keyed by guid.
// Times are epoch milliseconds. A card with no row is new.
export const cardState = sqliteTable(
  'card_state',
  {
    deck: text('deck').notNull(),
    guid: text('guid').notNull(),
    due: integer('due').notNull(),
    stability: real('stability').notNull(),
    difficulty: real('difficulty').notNull(),
    // 1 learning, 2 review, 3 relearning.
    state: integer('state').notNull(),
    reps: integer('reps').notNull(),
    lapses: integer('lapses').notNull(),
    learningSteps: integer('learning_steps').notNull(),
    scheduledDays: integer('scheduled_days').notNull(),
    lastReview: integer('last_review').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.deck, t.guid] }),
    check('card_state_state_range', sql`${t.state} between 1 and 3`),
    index('card_state_due').on(t.due),
  ],
);

// One row per rating. `previousState` is the card_state row before the rating as JSON, null for a first rating.
export const reviewLog = sqliteTable(
  'review_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    deck: text('deck').notNull(),
    guid: text('guid').notNull(),
    rating: integer('rating').notNull(),
    reviewedAt: integer('reviewed_at').notNull(),
    previousState: text('previous_state'),
  },
  (t) => [
    check('review_log_rating_range', sql`${t.rating} between 1 and 4`),
    index('review_log_reviewed_at').on(t.reviewedAt),
  ],
);
