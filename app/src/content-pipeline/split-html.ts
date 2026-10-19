// Finds heading tags in rendered HTML and cuts the HTML at them.
// Heading depth, text and id always come from the renderer's `headings`, so a `## ` line
// inside a code block can never count (code text is escaped in the HTML).
import { findStartTags } from './html-tags';
import type { RenderedHeading, TocHeading } from './types';

export type HeadingTag = {
  readonly heading: RenderedHeading;
  // Index of the opening `<hN`, and the index just after the closing `</hN>`.
  readonly start: number;
  readonly bodyStart: number;
};

const HEADING_TAG = /<h([1-6])(?=[\s>])[^>]*>/gi;

// Undefined when the rendered tags do not line up with the renderer's heading list.
export function locateHeadings(
  html: string,
  headings: readonly RenderedHeading[],
): readonly HeadingTag[] | undefined {
  const matches = Array.from(html.matchAll(HEADING_TAG));
  if (matches.length !== headings.length) return undefined;
  const tags = matches.map((match, index) => {
    const heading = headings[index];
    const depth = Number(match[1]);
    const closing = `</h${depth}>`;
    const closeAt = html.indexOf(closing, match.index);
    const id = /\sid=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(match[0]);
    const slug = id?.[1] ?? id?.[2] ?? id?.[3];
    if (!heading || heading.depth !== depth || heading.slug !== slug || closeAt === -1) {
      return undefined;
    }
    return { heading, start: match.index, bodyStart: closeAt + closing.length };
  });
  return tags.every((tag) => tag !== undefined) ? tags : undefined;
}

// The HTML after heading `from` up to (not including) heading `to`, or the end of the HTML.
export function bodyBetween(
  html: string,
  tags: readonly HeadingTag[],
  from: number,
  to: number | undefined,
): string {
  const begin = tags[from]?.bodyStart ?? 0;
  const end = to === undefined ? html.length : (tags[to]?.start ?? html.length);
  return html.slice(begin, end).trim();
}

// The headings strictly between index `from` and `to`, for a table of contents.
export function tocBetween(
  tags: readonly HeadingTag[],
  from: number,
  to: number | undefined,
): readonly TocHeading[] {
  return tags.slice(from + 1, to).map(({ heading }) => ({
    depth: heading.depth,
    text: heading.text,
    anchor: heading.slug,
  }));
}

// Index of the first heading after `from` whose depth is at most `depth`.
export function nextHeadingIndex(
  tags: readonly HeadingTag[],
  from: number,
  depth: number,
): number | undefined {
  const offset = tags.slice(from + 1).findIndex(({ heading }) => heading.depth <= depth);
  return offset === -1 ? undefined : from + 1 + offset;
}

// Link targets in a piece of HTML, in document order. Used to read the exercise tables.
export function hrefsIn(html: string): readonly string[] {
  return findStartTags(html).flatMap((tag) => {
    const href = tag.attributes.find((attribute) => attribute.name === 'href')?.value;
    return href === undefined ? [] : [href];
  });
}
