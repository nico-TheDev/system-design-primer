// Reads and rewrites `<a>` and `<img>` start tags in rendered HTML.
// The renderer keeps raw HTML as written, so attribute values can be unquoted (`href=https://x`).
// Code text is escaped by the renderer, so only real tags match.

export type Attribute = {
  readonly name: string;
  // Raw attribute text, still entity encoded. Undefined for a bare attribute such as `hidden`.
  readonly value: string | undefined;
};

export type StartTag = {
  readonly name: 'a' | 'img';
  readonly start: number;
  readonly end: number;
  readonly attributes: readonly Attribute[];
};

const START_TAG = /<(a|img)(?=[\s/>])((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (whole, hex, dec, named) => {
    if (typeof hex === 'string') return String.fromCodePoint(Number.parseInt(hex, 16));
    if (typeof dec === 'string') return String.fromCodePoint(Number.parseInt(dec, 10));
    return NAMED_ENTITIES[String(named).toLowerCase()] ?? whole;
  });
}

export function encodeAttribute(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function readAttributes(raw: string): readonly Attribute[] {
  return Array.from(raw.matchAll(ATTRIBUTE), (match) => ({
    name: (match[1] ?? '').toLowerCase(),
    value: match[2] ?? match[3] ?? match[4],
  }));
}

export function findStartTags(html: string): readonly StartTag[] {
  return Array.from(html.matchAll(START_TAG), (match) => ({
    name: (match[1] ?? '').toLowerCase() === 'a' ? ('a' as const) : ('img' as const),
    start: match.index,
    end: match.index + match[0].length,
    attributes: readAttributes(match[2] ?? ''),
  }));
}

export function readAttribute(tag: StartTag, name: string): string | undefined {
  return tag.attributes.find((attribute) => attribute.name === name)?.value;
}

export function renderStartTag(name: string, attributes: readonly Attribute[]): string {
  const parts = attributes.map(({ name: attribute, value }) =>
    value === undefined ? attribute : `${attribute}="${value.replaceAll('"', '&quot;')}"`,
  );
  return `<${[name, ...parts].join(' ')}>`;
}

// Puts `texts[i]` in place of `tags[i]`; an `undefined` text keeps that tag byte for byte.
export function spliceStartTags(
  html: string,
  tags: readonly StartTag[],
  texts: readonly (string | undefined)[],
): string {
  const pieces = tags.map((tag, index) => {
    const previousEnd = tags[index - 1]?.end ?? 0;
    return html.slice(previousEnd, tag.start) + (texts[index] ?? html.slice(tag.start, tag.end));
  });
  return pieces.join('') + html.slice(tags.at(-1)?.end ?? 0);
}
