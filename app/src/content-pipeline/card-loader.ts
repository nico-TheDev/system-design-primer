// The Astro loader for the `cards` collection (spec 0008). It reads each .apkg deck in
// resources/flash_cards/ and, like the content loaders, keeps its watch state in a closure at the edge.
// A deck that cannot be read keeps its last good cards; a deck file that is gone loses its cards.
import { readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { Loader, LoaderContext } from 'astro/loaders';
import { readApkg } from '@/db/apkg';
import { compareDecks, deckSlug, shapeDeck } from './cards';
import { REPO_ROOT } from './repo-root';
import type { Card } from './types';

const DECK_DIR = resolve(REPO_ROOT, 'resources', 'flash_cards');
// A save that replaces a file shows up as unlink then add, so all three are watched.
const WATCH_EVENTS = ['add', 'change', 'unlink'] as const;

const isDeckFile = (changed: string): boolean => {
  const path = resolve(changed);
  return !relative(DECK_DIR, path).startsWith('..') && path.toLowerCase().endsWith('.apkg');
};

const listDeckFiles = async (): Promise<readonly string[]> => {
  try {
    const names = await readdir(DECK_DIR);
    return names.filter((name) => name.toLowerCase().endsWith('.apkg')).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
};

export function createCardLoader(): Loader {
  let generation = 0;
  let running: Promise<void> = Promise.resolve();
  const watched = new WeakSet<object>();

  const sync = async (context: LoaderContext): Promise<void> => {
    const startedAt = generation;
    const { logger, store } = context;
    let files: readonly string[];
    try {
      files = await listDeckFiles();
    } catch (error) {
      logger.error(
        `flash card decks could not be listed, keeping what is loaded: ${String(error)}`,
      );
      return;
    }

    const before = store.values().map((entry) => entry.data as unknown as Card);
    const fresh = new Map<string, readonly Card[]>();
    const slugs = new Set<string>();
    for (const file of files) {
      const slug = deckSlug(file);
      if (slugs.has(slug)) {
        logger.error(
          `flash card deck ${file} has the same slug "${slug}" as another deck, skipped`,
        );
        continue;
      }
      slugs.add(slug);
      try {
        const raw = await readApkg(join(DECK_DIR, file));
        const { cards, notices } = shapeDeck(slug, file.replace(/\.apkg$/i, ''), raw);
        notices.forEach(({ message }) => logger.warn(message));
        fresh.set(slug, cards);
      } catch (error) {
        logger.error(
          `flash card deck ${file} could not be read, keeping its last cards: ${String(error)}`,
        );
      }
    }

    // Decks that read fine are replaced; decks that failed carry their old cards; decks whose file is gone drop out.
    const kept = before.filter((card) => slugs.has(card.deck) && !fresh.has(card.deck));
    const merged = [...[...fresh.values()].flat(), ...kept].sort(
      (a, b) => compareDecks(a.deck, b.deck) || a.order - b.order,
    );
    const ordered = merged.map((card, order) => ({ ...card, order }));

    try {
      const entries = await Promise.all(
        ordered.map(async (card) => ({
          id: card.id,
          data: await context.parseData({ id: card.id, data: card }),
        })),
      );
      // A newer change started while this one was parsing: let that run store its result.
      if (startedAt !== generation) return;
      store.clear();
      entries.forEach(({ id, data }) =>
        store.set({ id, data, digest: context.generateDigest(data) }),
      );
      logger.info(`flash cards: ${entries.length} cards in ${slugs.size} decks`);
    } catch (error) {
      logger.error(`could not store flash cards: ${String(error)}`);
    }
  };

  // Runs one after another so a quick second save never races the first.
  const enqueue = (context: LoaderContext): Promise<void> => {
    running = running.then(() => sync(context));
    return running;
  };

  return {
    name: 'content-pipeline-cards',
    load: async (context) => {
      const { watcher } = context;
      if (watcher && !watched.has(watcher)) {
        watched.add(watcher);
        watcher.add(DECK_DIR);
        const onChange = (changed: string): void => {
          if (!isDeckFile(changed)) return;
          generation += 1;
          void enqueue(context);
        };
        WATCH_EVENTS.forEach((event) => watcher.on(event, onChange));
      }
      await enqueue(context);
    },
  };
}
