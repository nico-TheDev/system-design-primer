// Counts for the flashcards page, the sidebar badge and the home line (spec 0008). Pure.
import {
  countDue,
  formatNextDue,
  isDueNow,
  studyDayEnd,
  type Phase,
  type Queued,
} from './flashcards-queue';

export const FLASHCARDS_HREF = '/flashcards/';
export const reviewHref = (deck?: string): string =>
  deck ? `/flashcards/review/?deck=${encodeURIComponent(deck)}` : '/flashcards/review/';

// A card from the collection plus where its schedule stands.
export type CardStanding = Queued & {
  readonly id: string;
  readonly deck: string;
  readonly deckTitle: string;
};

export type DeckSummary = {
  readonly deck: string;
  readonly deckTitle: string;
  readonly total: number;
  readonly newAvailable: number;
  readonly dueNow: number;
};

export type FlashcardsSummary = {
  readonly decks: readonly DeckSummary[];
  readonly total: number;
  readonly dueNow: number;
  readonly newAvailable: number;
  // Due now plus new cards still allowed today.
  readonly waiting: number;
  // When the next card comes back, formatted for display; undefined when none is scheduled.
  readonly nextDue: string | undefined;
};

export const standing = (
  card: {
    readonly id: string;
    readonly deck: string;
    readonly deckTitle: string;
    readonly order: number;
  },
  saved: { readonly state: Phase; readonly due: number } | undefined,
): CardStanding => ({ ...card, state: saved?.state ?? 0, due: saved?.due ?? 0 });

export const nextDueAt = (
  cards: readonly CardStanding[],
  remaining: number,
  now: number,
): number | undefined => {
  const later = cards.filter((card) => card.state !== 0 && !isDueNow(card, now)).map((c) => c.due);
  // With the daily allowance used up, new cards return when the study day rolls over.
  const hasNew = cards.some((card) => card.state === 0);
  const times = [...later, ...(hasNew && remaining === 0 ? [studyDayEnd(now)] : [])];
  return times.length > 0 ? Math.min(...times) : undefined;
};

export const summarizeFlashcards = (
  cards: readonly CardStanding[],
  remaining: number,
  now: number,
): FlashcardsSummary => {
  const decks = [...new Set(cards.map((card) => card.deck))].map((deck): DeckSummary => {
    const own = cards.filter((card) => card.deck === deck);
    const fresh = own.filter((card) => card.state === 0).length;
    return {
      deck,
      deckTitle: own[0]?.deckTitle ?? deck,
      total: own.length,
      newAvailable: Math.min(remaining, fresh),
      dueNow: countDue(own, now),
    };
  });
  const dueNow = countDue(cards, now);
  const newAvailable = Math.min(remaining, cards.filter((card) => card.state === 0).length);
  const next = nextDueAt(cards, remaining, now);
  return {
    decks,
    total: cards.length,
    dueNow,
    newAvailable,
    waiting: dueNow + newAvailable,
    nextDue: next === undefined ? undefined : formatNextDue(next, now),
  };
};

export const waitingLabel = (count: number): string =>
  `${count} ${count === 1 ? 'card' : 'cards'} to review today`;

export const homeLine = (summary: FlashcardsSummary): string =>
  summary.waiting > 0
    ? waitingLabel(summary.waiting)
    : `Nothing due${summary.nextDue ? `, next card ${summary.nextDue}` : ''}`;
