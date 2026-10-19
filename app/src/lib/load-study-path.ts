import { getCollection } from 'astro:content';
import { listActiveIds, listFinished } from '@/db/practice';
import { listDone } from '@/db/progress';
import { FLASHCARDS_HREF, waitingLabel } from '@/lib/flashcards';
import { loadFlashcards } from '@/lib/load-flashcards';
import { toPracticeIndex } from '@/lib/practice';
import { toDoneIndex } from '@/lib/progress';
import { buildStudyPath } from '@/lib/study-path';

// The one place that reads the collections, the done marks, the practice sessions and the flashcard counts; pages call it once per request.
export const loadStudyPath = async () => {
  const [topics, exercises] = await Promise.all([
    getCollection('topics'),
    getCollection('exercises'),
  ]);
  const index = toDoneIndex(listDone());
  const practice = toPracticeIndex(listFinished(), listActiveIds());
  const { summary } = await loadFlashcards(Date.now());
  const built = buildStudyPath(
    topics.map((entry) => entry.data),
    exercises.map((entry) => entry.data),
    index,
    practice,
  );
  // Flashcards sit at the end of the contents with a badge for the cards waiting today.
  const flashcards = {
    title: 'Flashcards',
    href: FLASHCARDS_HREF,
    ...(summary.waiting > 0
      ? { badge: { count: summary.waiting, label: waitingLabel(summary.waiting) } }
      : {}),
  };
  return {
    path: { ...built, nav: [...built.nav, { label: 'Review', items: [flashcards] }] },
    index,
    flashcards: summary,
  };
};
