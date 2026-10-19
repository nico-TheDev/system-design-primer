// Turns raw deck notes into cards: a plain text title and a back that passed the allowlist.
// Pure: the file reading is in src/db/apkg.ts and the watching is in card-loader.ts.
import sanitizeHtml, { type IOptions, type Tag } from 'sanitize-html';
import type { RawDeck } from '@/db/apkg';
import { warn, type Card, type Notice } from './types';

export const DECK_ORDER: readonly string[] = [
  'system-design',
  'system-design-exercises',
  'oo-design',
];

export const deckSlug = (fileName: string): string =>
  fileName
    .replace(/\.apkg$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const cardKey = (deck: string, guid: string): string => `${deck}:${guid}`;

// Known decks first in their fixed order, any others after, by name.
export const compareDecks = (a: string, b: string): number => {
  const rank = (deck: string): number => {
    const index = DECK_ORDER.indexOf(deck);
    return index === -1 ? DECK_ORDER.length : index;
  };
  return rank(a) - rank(b) || a.localeCompare(b);
};

const SAFE_SCHEMES = ['http', 'https', 'mailto'] as const;
// An unsafe link or image becomes a bare span, so its text stays and nothing live is left. (Renaming to a
// disallowed tag leaves a stray closing tag in sanitize-html.)
const UNWRAP: Tag = { tagName: 'span', attribs: {} };

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'em',
  'strong',
  'b',
  'i',
  'sub',
  'sup',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'div',
  'span',
];

const hasScheme = (value: string | undefined, schemes: readonly string[]): boolean => {
  const match = /^\s*([a-z][a-z0-9+.-]*):/i.exec(value ?? '');
  return match?.[1] !== undefined && schemes.includes(match[1].toLowerCase());
};

const CLEAN: IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    img: ['src', 'alt', 'width', 'height', 'loading', 'decoding', 'referrerpolicy'],
  },
  allowedSchemes: [...SAFE_SCHEMES],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (_tag, attribs) =>
      hasScheme(attribs.href, SAFE_SCHEMES)
        ? {
            tagName: 'a',
            attribs: { href: attribs.href ?? '', rel: 'noopener noreferrer', target: '_blank' },
          }
        : UNWRAP,
    img: (_tag, attribs) =>
      hasScheme(attribs.src, ['http', 'https'])
        ? {
            tagName: 'img',
            attribs: {
              ...(attribs.src ? { src: attribs.src } : {}),
              ...(attribs.width ? { width: attribs.width } : {}),
              ...(attribs.height ? { height: attribs.height } : {}),
              alt: attribs.alt?.trim() ? attribs.alt : 'Image',
              loading: 'lazy',
              decoding: 'async',
              referrerpolicy: 'no-referrer',
            },
          }
        : UNWRAP,
  },
};

// Jupyter pilcrow links are removed before the allowlist runs, so this never depends on filter order.
const ANCHOR_LINK =
  /<a\b[^>]*\bclass\s*=\s*["'][^"']*\banchor-link\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi;

export const cleanHtml = (html: string): string =>
  sanitizeHtml(html.replace(ANCHOR_LINK, ''), CLEAN);

const ENTITIES: Readonly<Record<string, string>> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&amp;': '&',
};

// Plain text of the front: tags gone, entities decoded, line breaks and runs of space become one space.
export const frontToTitle = (html: string): string => {
  const spaced = html.replace(/<br\s*\/?>|<\/(?:p|div|h[1-6]|li)>/gi, ' ');
  const text = sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} });
  return text
    .replace(/&(?:lt|gt|quot|#39|amp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
};

export type DeckCards = {
  readonly cards: readonly Card[];
  readonly notices: readonly Notice[];
};

// Notes that cannot be used are skipped with a warning, never silently.
export const shapeDeck = (slug: string, fallbackTitle: string, raw: RawDeck): DeckCards => {
  const notices: Notice[] = raw.skipped.map((message) =>
    warn(`flash card deck ${slug}: ${message}, skipped`),
  );
  const cards: Card[] = [];
  raw.notes.forEach((note) => {
    const title = frontToTitle(note.fields[0]);
    const backHtml = cleanHtml(note.fields[1]).trim();
    if (!title || !backHtml) {
      notices.push(
        warn(`flash card deck ${slug}: note ${note.id} has an empty front or back, skipped`),
      );
      return;
    }
    cards.push({
      id: cardKey(slug, note.guid),
      deck: slug,
      deckTitle: raw.name ?? fallbackTitle,
      guid: note.guid,
      order: cards.length,
      title,
      backHtml,
    });
  });
  return { cards, notices };
};
