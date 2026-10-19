// The only file that imports the FSRS scheduler (spec 0008). It maps saved rows to the scheduler's
// card and back, and turns a rating into the next schedule.
import { createEmptyCard, fsrs, generatorParameters, State, type Card, type Grade } from 'ts-fsrs';
import {
  formatInterval,
  REQUEST_RETENTION,
  type Previews,
  type Rating,
  type Schedule,
} from './flashcards-queue';

const scheduler = fsrs(
  generatorParameters({ request_retention: REQUEST_RETENTION, enable_fuzz: false }),
);

const GRADES: readonly Grade[] = [1, 2, 3, 4];

export const toCard = (schedule: Schedule): Card => ({
  due: new Date(schedule.due),
  stability: schedule.stability,
  difficulty: schedule.difficulty,
  // Deprecated in v5 and recomputed from last_review.
  elapsed_days: 0,
  scheduled_days: schedule.scheduledDays,
  learning_steps: schedule.learningSteps,
  reps: schedule.reps,
  lapses: schedule.lapses,
  state: schedule.state,
  last_review: new Date(schedule.lastReview),
});

const savedState = (state: State): 1 | 2 | 3 =>
  state === State.Review ? 2 : state === State.Relearning ? 3 : 1;

export const fromCard = (card: Card, reviewedAt: number): Schedule => ({
  due: card.due.getTime(),
  stability: card.stability,
  difficulty: card.difficulty,
  state: savedState(card.state),
  reps: card.reps,
  lapses: card.lapses,
  learningSteps: card.learning_steps,
  scheduledDays: card.scheduled_days,
  lastReview: card.last_review?.getTime() ?? reviewedAt,
});

const cardFor = (current: Schedule | undefined, now: number): Card =>
  current ? toCard(current) : createEmptyCard(new Date(now));

export const rate = (current: Schedule | undefined, rating: Rating, now: number): Schedule =>
  fromCard(scheduler.next(cardFor(current, now), new Date(now), rating).card, now);

// How long until the card returns for each button, for the labels.
export const previews = (current: Schedule | undefined, now: number): Previews => {
  const record = scheduler.repeat(cardFor(current, now), new Date(now));
  const [again, hard, good, easy] = GRADES.map((grade) =>
    formatInterval(record[grade].card.due.getTime() - now),
  );
  return [again ?? '', hard ?? '', good ?? '', easy ?? ''];
};
