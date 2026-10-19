import { actions } from 'astro:actions';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ExerciseKind } from '@/content-pipeline/types';
import {
  elapsedAt,
  formatClock,
  isRunning,
  isStretchCapped,
  PRACTICE_STEP_COUNT,
  PRACTICE_STEPS,
  PRACTICE_TARGET_MS,
  type PracticeClock,
} from '@/lib/practice';
import './practice-session.css';

type Props = {
  exerciseId: string;
  kind: ExerciseKind;
  step: number;
  revealed: boolean;
  elapsedMs: number;
  runningSince?: number | undefined;
  // Server time at render, so the first client render matches the server HTML.
  serverNow: number;
  // The problem, and the solution once it was revealed, rendered by the page.
  children: ReactNode;
};

type Outcome<T> = {
  readonly data: T | undefined;
  readonly error: { readonly code: string; readonly message: string } | undefined;
};

export function PracticeSession({
  exerciseId,
  kind,
  step: savedStep,
  revealed,
  elapsedMs,
  runningSince,
  serverNow,
  children,
}: Props) {
  const [step, setStep] = useState(savedStep);
  // A missing optional prop can arrive as null after Astro serializes it.
  const [clock, setClock] = useState<PracticeClock>({
    elapsedMs,
    runningSince: runningSince ?? undefined,
  });
  const [now, setNow] = useState(serverNow);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [event, setEvent] = useState('');
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const discardRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  const running = isRunning(clock, now);
  const capped = isStretchCapped(clock, now);
  const elapsed = elapsedAt(clock, now);
  const over = elapsed >= PRACTICE_TARGET_MS;
  const current = PRACTICE_STEPS[kind][step - 1];

  // Only a running clock needs a tick. A paused one is frozen and a capped one has stopped.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  // Keep focus in the confirm row, and give it back to Discard when the row closes.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) discardRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const execute = async <T,>(call: () => Promise<Outcome<T>>, onOk: (data: T) => void) => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await call();
      if (result.error) {
        // The session is gone (for example finished in another tab): show what is saved.
        if (result.error.code === 'NOT_FOUND') window.location.reload();
        else setError(result.error.message);
        return;
      }
      if (result.data !== undefined) onOk(result.data);
    } catch {
      setError('Could not reach the app. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // Event handlers return nothing; execute never rejects because it catches its own failures.
  const run = <T,>(call: () => Promise<Outcome<T>>, onOk: (data: T) => void): void => {
    void execute(call, onOk);
  };

  const reload = () => window.location.reload();

  const toggleRunning = () =>
    run(
      () => actions.setPracticeRunning({ exerciseId, running: !running }),
      (data) => {
        const t = Date.now();
        setNow(t);
        setClock({ elapsedMs: data.elapsedMs, runningSince: data.running ? t : undefined });
        setEvent(data.running ? 'Resumed' : 'Paused');
      },
    );

  const goTo = (next: number) =>
    run(
      () => actions.setPracticeStep({ exerciseId, step: next }),
      (data) => setStep(data.step),
    );

  const reveal = () => run(() => actions.revealSolution({ exerciseId }), reload);
  const finish = () => run(() => actions.finishPractice({ exerciseId }), reload);
  const discard = () => run(() => actions.discardPractice({ exerciseId }), reload);

  return (
    <div className="ps">
      <div className="ps-bar" role="group" aria-label="Practice timer">
        <span className="ps-time">{formatClock(elapsed)}</span>
        {capped ? (
          <span className="ps-note">Paused after 3 hours</span>
        ) : (
          !running && <span className="ps-note">Paused</span>
        )}
        {over && <span className="ps-over">Over target</span>}
        <button type="button" className="ps-btn" onClick={toggleRunning} disabled={busy}>
          {running ? 'Pause' : 'Resume'}
        </button>
        <span className="ps-target">Target {formatClock(PRACTICE_TARGET_MS)}</span>
      </div>

      {/* Only the node that changes is read out, so the ticking time is never announced. */}
      <div className="ps-sr-only" role="status" aria-live="polite">
        <span>{event}</span>
        {over && <span>Over target</span>}
        {capped && <span>Paused after 3 hours</span>}
      </div>

      {current && (
        <section className="ps-step" aria-labelledby="ps-step-title">
          <p className="ps-step-count">
            Step {step} of {PRACTICE_STEP_COUNT}
          </p>
          <h2 id="ps-step-title" className="ps-step-title">
            {current.title}
          </h2>
          <p className="ps-step-prompt">{current.prompt}</p>
          <div className="ps-row">
            <button
              type="button"
              className="ps-btn"
              onClick={() => goTo(step - 1)}
              disabled={busy || step <= 1}
            >
              Back
            </button>
            <button
              type="button"
              className="ps-btn"
              onClick={() => goTo(step + 1)}
              disabled={busy || step >= PRACTICE_STEP_COUNT}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {children}

      <div className="ps-actions ps-row">
        {revealed ? (
          <button type="button" className="ps-btn ps-btn-primary" onClick={finish} disabled={busy}>
            Finish practice
          </button>
        ) : (
          <button type="button" className="ps-btn ps-btn-primary" onClick={reveal} disabled={busy}>
            Reveal solution
          </button>
        )}
        {confirming ? (
          <>
            <p className="ps-confirm">Discard this session? Your time is lost.</p>
            <button type="button" className="ps-btn" onClick={discard} disabled={busy}>
              Yes, discard
            </button>
            <button
              type="button"
              className="ps-btn"
              ref={cancelRef}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ps-btn"
            ref={discardRef}
            onClick={() => setConfirming(true)}
            disabled={busy}
          >
            Discard session
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="ps-error">
          {error}
        </p>
      )}
    </div>
  );
}
