// The two Astro loaders. They share one snapshot per sync: the repo is read and rendered once,
// then each loader stores its own part. This file holds the pipeline's only mutable state
// (the in flight snapshot and a change counter), kept in a closure at the edge on purpose.
import { relative, resolve } from 'node:path';
import type { AstroIntegrationLogger } from 'astro';
import type { Loader, LoaderContext } from 'astro/loaders';
import { buildContent, type Render } from './build-content';
import { readRepo } from './read-repo';
import { REPO_ROOT } from './repo-root';
import type { Content, Notice } from './types';

const WATCHED_README = resolve(REPO_ROOT, 'README.md');
const WATCHED_SOLUTIONS = resolve(REPO_ROOT, 'solutions');
const WATCH_EVENTS = ['add', 'change', 'unlink', 'addDir', 'unlinkDir'] as const;

type Pick = 'topics' | 'exercises';

const isWatched = (changed: string): boolean => {
  const path = resolve(changed);
  return (
    path === WATCHED_README ||
    path === WATCHED_SOLUTIONS ||
    !relative(WATCHED_SOLUTIONS, path).startsWith('..')
  );
};

function logContent(logger: AstroIntegrationLogger, content: Content): void {
  const seen = new Set<string>();
  const unique = content.notices.filter((notice: Notice) => {
    if (seen.has(notice.key)) return false;
    seen.add(notice.key);
    return true;
  });
  logger.info(
    `content: ${content.topics.length} topics, ${content.exercises.length} exercises, ${unique.length} warnings`,
  );
  unique.forEach(({ level, message }) =>
    level === 'error' ? logger.error(message) : logger.warn(message),
  );
}

export function createContentLoaders(): { readonly topics: Loader; readonly exercises: Loader } {
  let inFlight: Promise<Content | undefined> | undefined;
  let generation = 0;
  const syncers = new Map<string, () => Promise<void>>();
  const watched = new WeakSet<object>();

  // One read and render per sync; an unreadable README leaves the stores untouched.
  const snapshot = (context: LoaderContext): Promise<Content | undefined> => {
    inFlight ??= (async () => {
      try {
        const render: Render = async (markdown) => {
          const { html, metadata } = await context.renderMarkdown(markdown);
          return {
            html,
            headings: (metadata?.headings ?? []).map(({ depth, slug, text }) => ({
              depth,
              slug,
              text,
            })),
          };
        };
        const content = await buildContent(await readRepo(), render);
        logContent(context.logger, content);
        return content;
      } catch (error) {
        context.logger.error(`content could not be read, keeping what is loaded: ${String(error)}`);
        return undefined;
      }
    })();
    return inFlight;
  };

  const sync = async (context: LoaderContext, pick: Pick): Promise<void> => {
    const startedAt = generation;
    const content = await snapshot(context);
    if (!content) {
      // Try again on the next change instead of caching the failure.
      if (startedAt === generation) inFlight = undefined;
      return;
    }
    try {
      const entries = await Promise.all(
        content[pick].map(async (entry) => ({
          id: entry.id,
          data: await context.parseData({ id: entry.id, data: entry }),
        })),
      );
      // A newer change started while this one was parsing: let that run store its result.
      if (startedAt !== generation) return;
      context.store.clear();
      entries.forEach(({ id, data }) =>
        context.store.set({ id, data, digest: context.generateDigest(data) }),
      );
    } catch (error) {
      context.logger.error(`could not store ${pick}: ${String(error)}`);
    }
  };

  const watch = (context: LoaderContext): void => {
    const { watcher } = context;
    if (!watcher || watched.has(watcher)) return;
    watched.add(watcher);
    watcher.add([WATCHED_README, WATCHED_SOLUTIONS]);
    // One listener serves both loaders: reset the shared snapshot, then refill both stores.
    const onChange = (changed: string): void => {
      if (!isWatched(changed)) return;
      generation += 1;
      inFlight = undefined;
      void Promise.all([...syncers.values()].map((run) => run()));
    };
    WATCH_EVENTS.forEach((event) => watcher.on(event, onChange));
  };

  const loader = (pick: Pick): Loader => ({
    name: `content-pipeline-${pick}`,
    load: async (context) => {
      syncers.set(pick, () => sync(context, pick));
      watch(context);
      await sync(context, pick);
    },
  });

  return { topics: loader('topics'), exercises: loader('exercises') };
}
