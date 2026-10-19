// Pass 3: rewrite links and images so they work inside the app.
// Only real `<a href>` and `<img src>` start tags are touched, never code text.
import { posix } from 'node:path';
import {
  decodeEntities,
  encodeAttribute,
  readAttribute,
  renderStartTag,
  findStartTags,
  spliceStartTags,
  type Attribute,
  type StartTag,
} from './html-tags';
import type { Notice, Topic } from './types';
import { warn } from './types';

export const UPSTREAM = 'https://github.com/donnemartin/system-design-primer';
const EXERCISE_TABLE_SLUGS = new Set([
  'system-design-interview-questions-with-solutions',
  'object-oriented-design-interview-questions-with-solutions',
]);
const SCHEME = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const IMGUR = /^https?:\/\/i\.imgur\.com\/([A-Za-z0-9]+)\.[A-Za-z0-9]+(?:[?#].*)?$/;
const EXERCISE_PATH = /^solutions\/(?:system_design|object_oriented_design)\/([^/]+)(?:\/.*)?$/;

export type LinkContext = {
  // Repo relative folder of the source file; empty for the README.
  readonly sourceDir: string;
  // Heading ids of the exercise being rewritten; undefined for the README.
  readonly ownSlugs: ReadonlySet<string> | undefined;
  // README heading id to the id of the topic that holds it.
  readonly topicBySlug: ReadonlyMap<string, string>;
  readonly readmeSlugs: ReadonlySet<string>;
  readonly appendixTopicId: string | undefined;
  readonly exerciseIds: ReadonlySet<string>;
  // imgur id to the file name of its local copy in `images/`.
  readonly imgurFiles: ReadonlyMap<string, string>;
  // Repo relative paths of the image files that exist.
  readonly imageFiles: ReadonlySet<string>;
};

type Resolved = { readonly value: string; readonly notices: readonly Notice[] };

export function buildTopicMap(topics: readonly Topic[]): ReadonlyMap<string, string> {
  return new Map(
    topics.flatMap((topic) => [
      [topic.id, topic.id] as const,
      ...topic.headings.map(({ anchor }) => [anchor, topic.id] as const),
    ]),
  );
}

export function buildImgurMap(imageFiles: readonly string[]): ReadonlyMap<string, string> {
  return new Map(
    imageFiles
      .filter((file) => posix.dirname(file) === 'images')
      .map((file) => [posix.parse(file).name, posix.basename(file)] as const),
  );
}

const unresolved = (target: string): Notice =>
  warn(`link "${target}" matches no topic or exercise, left as written`, `link:${target}`);

function anchorTarget(slug: string, context: LinkContext, allowOwn: boolean): Resolved {
  const topic = context.topicBySlug.get(slug);
  if (allowOwn && context.ownSlugs?.has(slug)) return { value: `#${slug}`, notices: [] };
  if (topic) {
    return {
      value: slug === topic ? `/topics/${topic}/` : `/topics/${topic}/#${slug}`,
      notices: [],
    };
  }
  if (EXERCISE_TABLE_SLUGS.has(slug)) return { value: '/exercises/', notices: [] };
  if (slug === 'appendix' && context.appendixTopicId) {
    return { value: `/topics/${context.appendixTopicId}/`, notices: [] };
  }
  // A README section that is not a topic (Contributing, Credits, ...) lives upstream.
  if (context.readmeSlugs.has(slug)) return { value: `${UPSTREAM}#${slug}`, notices: [] };
  return { value: `#${slug}`, notices: [unresolved(`#${slug}`)] };
}

function exerciseTarget(
  path: string,
  fragment: string,
  context: LinkContext,
): Resolved | undefined {
  const candidates = [posix.join(context.sourceDir, path), posix.normalize(path)];
  const folder = candidates
    .map((candidate) => EXERCISE_PATH.exec(candidate)?.[1])
    .find((name) => name !== undefined && context.exerciseIds.has(name));
  const isPage = /(?:^|\/)(?:README\.md|[^/]+\.ipynb)$/i.test(path) || path.endsWith('/');
  return folder && isPage ? { value: `/exercises/${folder}/${fragment}`, notices: [] } : undefined;
}

function resolveHref(href: string, context: LinkContext): Resolved | undefined {
  if (href.startsWith('#')) return anchorTarget(href.slice(1), context, true);
  if (href === UPSTREAM || href === `${UPSTREAM}/`) return undefined;
  if (href.startsWith(`${UPSTREAM}#`) || href.startsWith(`${UPSTREAM}/#`)) {
    return anchorTarget(href.slice(href.indexOf('#') + 1), context, false);
  }
  if (SCHEME.test(href) || href === '') return undefined;
  const hash = href.indexOf('#');
  const path = hash === -1 ? href : href.slice(0, hash);
  const fragment = hash === -1 ? '' : href.slice(hash);
  return exerciseTarget(path, fragment, context) ?? { value: href, notices: [unresolved(href)] };
}

const encodePath = (path: string): string => path.split('/').map(encodeURIComponent).join('/');

function resolveImage(src: string, context: LinkContext): Resolved | undefined {
  const imgur = IMGUR.exec(src);
  if (imgur) {
    const file = context.imgurFiles.get(imgur[1] ?? '');
    return file
      ? { value: `/repo-images/images/${encodeURIComponent(file)}`, notices: [] }
      : undefined;
  }
  if (SCHEME.test(src) || src === '') return undefined;
  const clean = src.replace(/[?#].*$/, '');
  const resolved = posix.join(context.sourceDir, clean);
  if (resolved.startsWith('..')) {
    return {
      value: src,
      notices: [warn(`image "${src}" points outside the repo`, `image:${src}`)],
    };
  }
  return {
    value: `/repo-images/${encodePath(resolved)}`,
    notices: context.imageFiles.has(resolved)
      ? []
      : [warn(`image "${src}" does not exist (looked for ${resolved})`, `image:${resolved}`)],
  };
}

// The renderer turns markdown images into this placeholder; read it back into plain attributes.
function readImagePlaceholder(tag: StartTag): Readonly<Record<string, unknown>> | undefined {
  const raw = readAttribute(tag, '__astro_image_');
  if (raw === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeEntities(raw));
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Readonly<Record<string, unknown>>)
      : undefined;
  } catch {
    return undefined;
  }
}

type Rewrite = { readonly text: string | undefined; readonly notices: readonly Notice[] };

function rewriteImage(tag: StartTag, context: LinkContext): Rewrite {
  const placeholder = readImagePlaceholder(tag);
  const original = placeholder ? placeholder.src : readAttribute(tag, 'src');
  const src = typeof original === 'string' ? decodeEntities(original) : undefined;
  const resolved = src === undefined ? undefined : resolveImage(src, context);
  const notices = resolved?.notices ?? [];
  if (!placeholder) {
    if (!resolved) return { text: undefined, notices };
    const attributes: readonly Attribute[] = tag.attributes.map((attribute) =>
      attribute.name === 'src'
        ? { name: 'src', value: encodeAttribute(resolved.value) }
        : attribute,
    );
    return { text: renderStartTag('img', attributes), notices };
  }
  const attributes: readonly Attribute[] = Object.entries(placeholder).flatMap(
    ([name, value]): readonly Attribute[] => {
      if (name === 'index' || (typeof value !== 'string' && typeof value !== 'number')) return [];
      const text = name === 'src' && resolved ? resolved.value : String(value);
      return [{ name, value: encodeAttribute(text) }];
    },
  );
  return { text: renderStartTag('img', attributes), notices };
}

function rewriteAnchor(tag: StartTag, context: LinkContext): Rewrite {
  const raw = readAttribute(tag, 'href');
  const resolved = raw === undefined ? undefined : resolveHref(decodeEntities(raw), context);
  if (!resolved) return { text: undefined, notices: [] };
  const attributes: readonly Attribute[] = tag.attributes.map((attribute) =>
    attribute.name === 'href'
      ? { name: 'href', value: encodeAttribute(resolved.value) }
      : attribute,
  );
  // A target that matched nothing stays byte for byte as written.
  return {
    text: resolved.notices.length > 0 ? undefined : renderStartTag('a', attributes),
    notices: resolved.notices,
  };
}

export function rewriteContent(
  html: string,
  context: LinkContext,
): { readonly html: string; readonly notices: readonly Notice[] } {
  const tags = findStartTags(html);
  const results = tags.map((tag) =>
    tag.name === 'a' ? rewriteAnchor(tag, context) : rewriteImage(tag, context),
  );
  return {
    html: spliceStartTags(
      html,
      tags,
      results.map(({ text }) => text),
    ),
    notices: results.flatMap(({ notices }) => notices),
  };
}
