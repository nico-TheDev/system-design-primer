import { getCollection } from 'astro:content';
import { cardKey, compareDecks } from '@/content-pipeline/cards';
import { countNewSince, listSaved } from '@/db/flashcards';
import { newRemaining, studyDayStart } from '@/lib/flashcards-queue';
import { standing, summarizeFlashcards, type CardStanding } from '@/lib/flashcards';

// The one place that reads the cards collection together with the saved schedules.
export const loadFlashcards = async (now: number) => {
  const entries = await getCollection('cards');
  const saved = new Map(listSaved().map((row) => [cardKey(row.deck, row.guid), row.schedule]));
  const remaining = newRemaining(countNewSince(studyDayStart(now)));
  const cards = entries
    .map((entry) => entry.data)
    .sort((a, b) => compareDecks(a.deck, b.deck) || a.order - b.order);
  const standings: readonly CardStanding[] = cards.map((card) =>
    standing(card, saved.get(card.id)),
  );
  return {
    cards,
    saved,
    standings,
    remaining,
    summary: summarizeFlashcards(standings, remaining, now),
  };
};
