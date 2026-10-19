import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { getEntry } from 'astro:content';
import {
  discardSession,
  finishSession,
  getActive,
  markRevealed,
  setClock,
  setStep,
  startSession,
} from '@/db/practice';
import { applyRating, undoNewest } from '@/db/flashcards';
import { setDone, unsetDone } from '@/db/progress';
import { cardKey } from '@/content-pipeline/cards';
import type { Rating } from '@/lib/flashcards-queue';
import { previews, rate } from '@/lib/flashcards-scheduler';
import { elapsedAt, PRACTICE_STEP_COUNT, withRunning } from '@/lib/practice';

const NOT_FOUND = 'That item is not in the study content any more.';
const SAVE_FAILED = 'Could not save your progress. Try again.';
const NO_SESSION = 'This practice session no longer exists.';
const PRACTICE_SAVE_FAILED = 'Could not save your practice session. Try again.';

const CARD_NOT_FOUND = 'That card is not in the decks any more.';
const NOT_NEWEST = 'Only your latest rating can be undone.';
const CARD_SAVE_FAILED = 'Could not save your rating. Try again.';

const exerciseId = z.string().min(1).max(200);

// Expected failures pass through; anything else is logged once and hidden behind a generic message.
const guard =
  (area: string, message: string) =>
  async <T>(work: () => Promise<T> | T): Promise<T> => {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ActionError) throw error;
      console.error(`[${area}] could not save`, error);
      throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message });
    }
  };
const guarded = guard('practice', PRACTICE_SAVE_FAILED);
const guardedCard = guard('flashcards', CARD_SAVE_FAILED);

// Reads the open session after the only await, so the write that follows cannot interleave with another request.
const requireActive = async (id: string) => {
  if (!(await getEntry('exercises', id)))
    throw new ActionError({ code: 'NOT_FOUND', message: NOT_FOUND });
  const session = getActive(id);
  if (!session) throw new ActionError({ code: 'NOT_FOUND', message: NO_SESSION });
  return session;
};

// The request carries the wanted end state, not a toggle, so repeats and two tabs end the same way.
export const server = {
  setProgress: defineAction({
    accept: 'form',
    input: z.object({
      kind: z.enum(['topic', 'exercise']),
      id: z.string().min(1).max(200),
      done: z.enum(['true', 'false']),
    }),
    handler: async ({ kind, id, done }) => {
      const entry = await getEntry(kind === 'topic' ? 'topics' : 'exercises', id);
      if (!entry) throw new ActionError({ code: 'NOT_FOUND', message: NOT_FOUND });
      try {
        if (done === 'true') setDone(kind, id);
        else unsetDone(kind, id);
      } catch (error) {
        console.error('[progress] could not save', error);
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: SAVE_FAILED });
      }
      return { kind, id, done: done === 'true' };
    },
  }),

  startPractice: defineAction({
    accept: 'form',
    input: z.object({ exerciseId }),
    handler: ({ exerciseId: id }) =>
      guarded(async () => {
        const entry = await getEntry('exercises', id);
        if (!entry) throw new ActionError({ code: 'NOT_FOUND', message: NOT_FOUND });
        if (!entry.data.split) {
          throw new ActionError({
            code: 'BAD_REQUEST',
            message: 'This exercise could not be split into problem and solution.',
          });
        }
        startSession(id, Date.now());
        return { exerciseId: id };
      }),
  }),

  setPracticeStep: defineAction({
    input: z.object({ exerciseId, step: z.number().int().min(1).max(PRACTICE_STEP_COUNT) }),
    handler: ({ exerciseId: id, step }) =>
      guarded(async () => {
        await requireActive(id);
        setStep(id, step);
        return { step };
      }),
  }),

  setPracticeRunning: defineAction({
    input: z.object({ exerciseId, running: z.boolean() }),
    handler: ({ exerciseId: id, running }) =>
      guarded(async () => {
        const session = await requireActive(id);
        const clock = withRunning(session, running, Date.now());
        setClock(id, clock);
        return { elapsedMs: clock.elapsedMs, running: clock.runningSince !== undefined };
      }),
  }),

  revealSolution: defineAction({
    input: z.object({ exerciseId }),
    handler: ({ exerciseId: id }) =>
      guarded(async () => {
        await requireActive(id);
        markRevealed(id);
        return { revealed: true as const };
      }),
  }),

  finishPractice: defineAction({
    input: z.object({ exerciseId }),
    handler: ({ exerciseId: id }) =>
      guarded(async () => {
        const session = await requireActive(id);
        if (!session.revealed) {
          throw new ActionError({
            code: 'BAD_REQUEST',
            message: 'Reveal the solution before you finish.',
          });
        }
        const now = Date.now();
        const durationMs = elapsedAt(session, now);
        finishSession(id, durationMs, now);
        return { durationMs };
      }),
  }),

  // A missing session is a quiet success: the page is already in the state the press asked for.
  discardPractice: defineAction({
    input: z.object({ exerciseId }),
    handler: ({ exerciseId: id }) =>
      guarded(() => {
        discardSession(id);
        return { discarded: true as const };
      }),
  }),

  // Writes after the only await, so the read, compute and save of a rating run as one step.
  rateCard: defineAction({
    input: z.object({
      deck: z.string().min(1).max(100),
      guid: z.string().min(1).max(64),
      rating: z.number().int().min(1).max(4),
    }),
    handler: ({ deck, guid, rating }) =>
      guardedCard(async () => {
        if (!(await getEntry('cards', cardKey(deck, guid)))) {
          throw new ActionError({ code: 'NOT_FOUND', message: CARD_NOT_FOUND });
        }
        const now = Date.now();
        const saved = applyRating(deck, guid, rating, now, (current) =>
          rate(current, rating as Rating, now),
        );
        return {
          logId: saved.logId,
          state: saved.schedule.state,
          dueAt: saved.schedule.due,
          previews: previews(saved.schedule, now),
        };
      }),
  }),

  undoRating: defineAction({
    input: z.object({ logId: z.number().int() }),
    handler: ({ logId }) =>
      guardedCard(async () => {
        const undone = undoNewest(logId);
        if (!undone) throw new ActionError({ code: 'NOT_FOUND', message: NOT_NEWEST });
        const missing = !(await getEntry('cards', cardKey(undone.deck, undone.guid)));
        return {
          deck: undone.deck,
          guid: undone.guid,
          state: undone.schedule?.state,
          dueAt: undone.schedule?.due,
          previews: previews(undone.schedule, Date.now()),
          missing,
        };
      }),
  }),
};
