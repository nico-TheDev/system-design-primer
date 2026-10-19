import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { getEntry } from 'astro:content';
import { setDone, unsetDone } from '@/db/progress';

const NOT_FOUND = 'That item is not in the study content any more.';
const SAVE_FAILED = 'Could not save your progress. Try again.';

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
};
