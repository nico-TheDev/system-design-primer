// Pure queue rules for the flashcards (spec 0008). No scheduler, database or Node import, so the
// review island can use it too. Times are epoch milliseconds.

export const NEW_PER_DAY = 10;
// A study day runs from 4 AM to 4 AM local time.
export const ROLLOVER_HOUR = 4;
export const LEARN_AHEAD_MINUTES = 20;
export const REQUEST_RETENTION = 0.9;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// 0 new (no saved row), 1 learning, 2 review, 3 relearning, as the scheduler numbers them.
export type Phase = 0 | 1 | 2 | 3;
export type Rating = 1 | 2 | 3 | 4;

// The saved schedule of one card: the persisted fields of the scheduler's card.
export type Schedule = {
  readonly due: number;
  readonly stability: number;
  readonly difficulty: number;
  readonly state: 1 | 2 | 3;
  readonly reps: number;
  readonly lapses: number;
  readonly learningSteps: number;
  readonly scheduledDays: number;
  readonly lastReview: number;
};

// Button labels for Again, Hard, Good, Easy.
export type Previews = readonly [string, string, string, string];

export const RATING_NAMES = ['Again', 'Hard', 'Good', 'Easy'] as const;

// What the queue needs to know about a card.
export type Queued = {
  readonly state: Phase;
  // Meaningless for a new card.
  readonly due: number;
  readonly order: number;
};

export const studyDayStart = (now: number): number => {
  const start = new Date(now);
  start.setHours(ROLLOVER_HOUR, 0, 0, 0);
  if (start.getTime() > now) start.setDate(start.getDate() - 1);
  return start.getTime();
};

export const studyDayEnd = (now: number): number => {
  const end = new Date(studyDayStart(now));
  end.setDate(end.getDate() + 1);
  return end.getTime();
};

export const newRemaining = (newStartedToday: number): number =>
  Math.max(0, NEW_PER_DAY - newStartedToday);

const learnAheadEnd = (now: number): number => now + LEARN_AHEAD_MINUTES * MINUTE;

const isLearning = (state: Phase): boolean => state === 1 || state === 3;

// A card is due now when a review is due before the study day ends, or a learning card is due within 20 minutes.
export const isDueNow = (card: Queued, now: number): boolean =>
  card.state === 2
    ? card.due < studyDayEnd(now)
    : isLearning(card.state) && card.due <= learnAheadEnd(now);

export const countDue = (cards: readonly Queued[], now: number): number =>
  cards.filter((card) => isDueNow(card, now)).length;

export const countNew = (cards: readonly Queued[]): number =>
  cards.filter((card) => card.state === 0).length;

// Cards that go into a session at page load: everything due now, then new cards up to the daily allowance.
export const buildQueue = <T extends Queued>(
  cards: readonly T[],
  now: number,
  remaining: number,
): readonly T[] => {
  const byOrder = (a: T, b: T) => a.order - b.order;
  const due = cards.filter((card) => isDueNow(card, now)).sort(byOrder);
  const fresh = cards
    .filter((card) => card.state === 0)
    .sort(byOrder)
    .slice(0, remaining);
  return [...due, ...fresh];
};

// Learning cards that have come due, then reviews by due time, then new cards in deck order.
// A learning card that is not due yet is shown only when nothing else is left and it is within 20 minutes.
export const pickNext = <T extends Queued>(cards: readonly T[], now: number): T | undefined => {
  const byDue = (a: T, b: T) => a.due - b.due || a.order - b.order;
  const byOrder = (a: T, b: T) => a.order - b.order;
  const learning = cards.filter((card) => isLearning(card.state));
  const ready = learning.filter((card) => card.due <= now).sort(byDue);
  const reviews = cards.filter((card) => card.state === 2).sort(byDue);
  const fresh = cards.filter((card) => card.state === 0).sort(byOrder);
  const waiting = learning
    .filter((card) => card.due > now && card.due <= learnAheadEnd(now))
    .sort(byDue);
  return ready[0] ?? reviews[0] ?? fresh[0] ?? waiting[0];
};

// Whether a card just rated stays in this session: only a learning card coming back within 20 minutes.
export const staysInSession = (card: Queued, now: number): boolean =>
  isLearning(card.state) && card.due <= learnAheadEnd(now);

// "<1m", "Nm", "Nh", "Nd", "Nmo", "Ny", rounded down.
export const formatInterval = (ms: number): string => {
  const span = Math.max(0, ms);
  if (span < MINUTE) return '<1m';
  if (span < HOUR) return `${Math.floor(span / MINUTE)}m`;
  if (span < DAY) return `${Math.floor(span / HOUR)}h`;
  const days = Math.floor(span / DAY);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const two = (n: number): string => String(n).padStart(2, '0');

// "today 18:40", "tomorrow 09:00" or "Tue 09:00" in local time; a date after a week adds the day and month.
export const formatNextDue = (due: number, now: number): string => {
  const at = new Date(due);
  const time = `${two(at.getHours())}:${two(at.getMinutes())}`;
  const dayOf = (ms: number) => {
    const day = new Date(ms);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
  };
  const days = Math.round((dayOf(due) - dayOf(now)) / DAY);
  if (days <= 0) return `today ${time}`;
  if (days === 1) return `tomorrow ${time}`;
  if (days < 7) return `${WEEKDAYS[at.getDay()] ?? ''} ${time}`;
  return `${at.getDate()} ${at.toLocaleString('en', { month: 'short' })} ${time}`;
};

// The earliest due time among cards that have a saved schedule, or undefined when there are none.
export const earliestDue = (cards: readonly Queued[]): number | undefined =>
  cards
    .filter((card) => card.state !== 0)
    .reduce<number | undefined>(
      (min, card) => (min === undefined || card.due < min ? card.due : min),
      undefined,
    );
