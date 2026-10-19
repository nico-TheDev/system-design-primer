import { actions } from 'astro:actions';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  earliestDue,
  formatNextDue,
  pickNext,
  RATING_NAMES,
  staysInSession,
  type Phase,
  type Previews,
  type Rating,
} from '@/lib/flashcards-queue';
import './review-session.css';

export type SessionCard = {
  id: string;
  deck: string;
  guid: string;
  deckTitle: string;
  title: string;
  // Cleaned when the deck is loaded; the only card HTML this island renders.
  backHtml: string;
  order: number;
  state: Phase;
  due: number;
  previews: Previews;
};

type Props = {
  cards: readonly SessionCard[];
  // Server time at render, so the first client render matches the server HTML.
  serverNow: number;
  // When the first card outside this session comes back.
  nextDue?: number | undefined;
};

type Outcome<T> = {
  readonly data: T | undefined;
  readonly error: { readonly code: string; readonly message: string } | undefined;
};

const RATINGS: readonly Rating[] = [1, 2, 3, 4];

const isField = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

// Buttons and links keep their own Space and Enter.
const isControl = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && ['BUTTON', 'A', 'SUMMARY'].includes(target.tagName);

export function ReviewSession({ cards, serverNow, nextDue }: Props) {
  // Every card of the session stays here, so an undone or re queued card can come back without a read.
  const [all, setAll] = useState<ReadonlyMap<string, SessionCard>>(
    () => new Map(cards.map((card) => [card.id, card])),
  );
  const [pool, setPool] = useState<readonly string[]>(() => cards.map((card) => card.id));
  const [currentId, setCurrentId] = useState<string | undefined>(
    () => pickNext(cards, serverNow)?.id,
  );
  const [revealed, setRevealed] = useState(false);
  const [lastLogId, setLastLogId] = useState<number | undefined>();
  const [reviewed, setReviewed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [announcement, setAnnouncement] = useState('');
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  // Browser time at the last change of card, for the next due text; the first render uses the server time.
  const [now, setNow] = useState(serverNow);
  // Moves focus once the new card or the answer is on screen.
  const focusTarget = useRef<'front' | 'back' | 'done' | undefined>(undefined);

  const current = currentId === undefined ? undefined : all.get(currentId);

  useEffect(() => {
    if (focusTarget.current === 'front') frontRef.current?.focus();
    else if (focusTarget.current === 'back') backRef.current?.focus();
    else if (focusTarget.current === 'done') doneRef.current?.focus();
    focusTarget.current = undefined;
  });

  const show = useCallback(
    (nextPool: readonly string[], map: ReadonlyMap<string, SessionCard>, forced?: string) => {
      const queued = nextPool.flatMap((id) => {
        const card = map.get(id);
        return card ? [card] : [];
      });
      const next = forced ?? pickNext(queued, Date.now())?.id;
      setPool(nextPool);
      setCurrentId(next);
      setRevealed(false);
      focusTarget.current = next === undefined ? 'done' : 'front';
      setNow(Date.now());
    },
    [],
  );

  const reveal = useCallback(() => {
    setRevealed(true);
    focusTarget.current = 'back';
  }, []);

  const call = async <T,>(work: () => Promise<Outcome<T>>): Promise<Outcome<T> | undefined> => {
    setBusy(true);
    setError(undefined);
    try {
      return await work();
    } catch {
      setError('Could not reach the app. Try again.');
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const rate = async (rating: Rating) => {
    if (!current || !revealed || busy) return;
    const result = await call(() =>
      actions.rateCard({ deck: current.deck, guid: current.guid, rating }),
    );
    if (!result) return;
    if (result.error) {
      if (result.error.code === 'NOT_FOUND') {
        // The card left the decks: drop it from the session and move on.
        setError(result.error.message);
        show(
          pool.filter((id) => id !== current.id),
          all,
        );
      } else setError(result.error.message);
      return;
    }
    if (!result.data) return;
    const { logId, state, dueAt, previews } = result.data;
    const updated: SessionCard = { ...current, state: state, due: dueAt, previews };
    const map = new Map(all).set(current.id, updated);
    const stays = staysInSession(updated, Date.now());
    setAll(map);
    setLastLogId(logId);
    setReviewed((n) => n + 1);
    setAnnouncement(`Rated ${RATING_NAMES[rating - 1] ?? ''}.`);
    show(
      stays
        ? [...pool.filter((id) => id !== current.id), current.id]
        : pool.filter((id) => id !== current.id),
      map,
    );
  };

  const undo = async () => {
    if (lastLogId === undefined || busy) return;
    const result = await call(() => actions.undoRating({ logId: lastLogId }));
    if (!result) return;
    if (result.error) {
      if (result.error.code === 'NOT_FOUND') setLastLogId(undefined);
      setError(result.error.message);
      return;
    }
    if (!result.data) return;
    const { deck, guid, state, dueAt, previews, missing } = result.data;
    const id = `${deck}:${guid}`;
    const card = all.get(id);
    setLastLogId(undefined);
    setReviewed((n) => Math.max(0, n - 1));
    if (missing || !card) {
      setAnnouncement('Rating undone. That card is no longer in the decks, so it was skipped.');
      show(
        pool.filter((poolId) => poolId !== id),
        all,
      );
      return;
    }
    const restored: SessionCard = {
      ...card,
      state: state ?? 0,
      due: dueAt ?? 0,
      previews,
    };
    const map = new Map(all).set(id, restored);
    setAll(map);
    setAnnouncement('Rating undone.');
    // The card goes back to the front of the session.
    show([...pool.filter((poolId) => poolId !== id), id], map, id);
  };

  // Keys: Space or Enter shows the answer, 1 to 4 rate, Z undoes. Buttons keep their own Space and Enter.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isField(event.target)) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        void undo();
      } else if ((event.key === ' ' || event.key === 'Enter') && current && !revealed) {
        if (isControl(event.target)) return;
        event.preventDefault();
        reveal();
      } else if (['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        void rate(Number(event.key) as Rating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const undoButton = (
    <button
      type="button"
      className="rs-btn"
      onClick={() => void undo()}
      disabled={busy || lastLogId === undefined}
    >
      Undo last rating <kbd>Z</kbd>
    </button>
  );

  const outsideDue = pool.length === 0 ? (nextDue ?? undefined) : undefined;
  const learningDue = earliestDue([...all.values()].filter((card) => !pool.includes(card.id)));
  const next =
    outsideDue === undefined
      ? learningDue
      : learningDue === undefined
        ? outsideDue
        : Math.min(outsideDue, learningDue);

  return (
    <div className="rs">
      <div className="rs-sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {current ? (
        <section aria-label="Flashcard">
          <p className="rs-meta">
            {current.deckTitle} · {pool.length} left{current.state === 0 ? ' · New' : ''}
          </p>
          <div className="rs-front" ref={frontRef} tabIndex={-1}>
            <h2 className="rs-title">{current.title}</h2>
          </div>

          {revealed ? (
            <>
              <div className="rs-back prose-ref" ref={backRef} tabIndex={-1} aria-label="Answer">
                <div dangerouslySetInnerHTML={{ __html: current.backHtml }} />
              </div>
              <div className="rs-rate" role="group" aria-label="How well did you remember it?">
                {RATINGS.map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className="rs-btn rs-rating"
                    onClick={() => void rate(rating)}
                    disabled={busy}
                  >
                    <span>
                      {RATING_NAMES[rating - 1]} <kbd>{rating}</kbd>
                    </span>
                    <span className="rs-interval">{current.previews[rating - 1]}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p>
              <button
                type="button"
                className="rs-btn rs-btn-primary"
                onClick={reveal}
                disabled={busy}
              >
                Show answer <kbd>Space</kbd>
              </button>
            </p>
          )}
          <p className="rs-undo">{undoButton}</p>
        </section>
      ) : (
        <section aria-labelledby="rs-done">
          <h2 id="rs-done" ref={doneRef} tabIndex={-1}>
            {reviewed > 0 || cards.length > 0 ? 'Done for today' : 'Nothing to review'}
          </h2>
          <p>
            {reviewed > 0 ? `You reviewed ${reviewed} ${reviewed === 1 ? 'card' : 'cards'}. ` : ''}
            {next === undefined
              ? 'No card is scheduled yet.'
              : `Next card ${formatNextDue(next, now)}.`}
          </p>
          <p className="rs-row">
            {undoButton}
            <a href="/flashcards/">Back to flashcards</a>
          </p>
        </section>
      )}

      {error && (
        <p role="alert" className="rs-error">
          {error}
        </p>
      )}
    </div>
  );
}
