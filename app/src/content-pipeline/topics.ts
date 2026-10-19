// README to topics: every `##` section except an exclude list, plus each `###` under Appendix.
import {
  bodyBetween,
  locateHeadings,
  nextHeadingIndex,
  tocBetween,
  type HeadingTag,
} from './split-html';
import { warn, type Notice, type Rendered, type Topic, type TopicKind } from './types';

// If upstream adds a README section that should not be a topic, add its slug here.
const EXCLUDED = new Set([
  'motivation',
  'anki-flashcards',
  'contributing',
  'index-of-system-design-topics',
  'system-design-interview-questions-with-solutions',
  'object-oriented-design-interview-questions-with-solutions',
  'under-development',
  'credits',
  'contact-info',
  'license',
]);

const APPENDIX = 'appendix';
const KIND_BY_SLUG: Readonly<Record<string, TopicKind>> = {
  'system-design-topics-start-here': 'start-here',
  'how-to-approach-a-system-design-interview-question': 'interview-approach',
  'study-guide': 'study-guide',
};
const KIND_RANK: Readonly<Record<TopicKind, number>> = {
  'start-here': 0,
  topic: 1,
  'interview-approach': 2,
  'study-guide': 3,
  appendix: 4,
};

type Draft = {
  readonly kind: TopicKind;
  readonly index: number;
  readonly end: number | undefined;
};

export type TopicsResult = {
  readonly topics: readonly Topic[];
  readonly notices: readonly Notice[];
};

function chunksFor(tags: readonly HeadingTag[]): readonly Draft[] {
  return tags.flatMap((tag, index): readonly Draft[] => {
    if (tag.heading.depth !== 2) return [];
    const nextH2 = nextHeadingIndex(tags, index, 2);
    if (tag.heading.slug !== APPENDIX) {
      if (EXCLUDED.has(tag.heading.slug)) return [];
      const kind = KIND_BY_SLUG[tag.heading.slug] ?? 'topic';
      return [{ kind, index, end: nextH2 }];
    }
    // Each `###` under Appendix is its own topic.
    return tags.flatMap((child, childIndex): readonly Draft[] =>
      childIndex > index &&
      (nextH2 === undefined || childIndex < nextH2) &&
      child.heading.depth === 3
        ? [{ kind: 'appendix', index: childIndex, end: nextHeadingIndex(tags, childIndex, 3) }]
        : [],
    );
  });
}

export function buildTopics(rendered: Rendered): TopicsResult {
  const tags = locateHeadings(rendered.html, rendered.headings);
  if (!tags) throw new Error('README headings do not match the rendered HTML');

  const drafts = chunksFor(tags);
  const appendixIndex = tags.findIndex(({ heading }) => heading.slug === APPENDIX);
  const firstAppendix = drafts.find(({ kind }) => kind === 'appendix');
  // Text between `## Appendix` and its first `###` goes at the top of the first appendix topic.
  const appendixIntro =
    appendixIndex === -1 || !firstAppendix
      ? ''
      : bodyBetween(rendered.html, tags, appendixIndex, firstAppendix.index);

  const built = drafts.flatMap((draft, position) => {
    const tag = tags[draft.index];
    if (!tag) return [];
    const body = bodyBetween(rendered.html, tags, draft.index, draft.end);
    return [
      {
        kind: draft.kind,
        position,
        id: tag.heading.slug,
        title: tag.heading.text,
        html: draft === firstAppendix && appendixIntro ? `${appendixIntro}\n${body}` : body,
        headings: tocBetween(tags, draft.index, draft.end),
      },
    ];
  });

  const duplicates = built.filter(
    (topic, index) => built.findIndex(({ id }) => id === topic.id) !== index,
  );
  const unique = built.filter((topic) => !duplicates.includes(topic));
  const topics = [...unique]
    .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.position - b.position)
    .map(({ id, title, kind, html, headings }, order): Topic => ({
      id,
      title,
      kind,
      order,
      html,
      headings,
    }));

  const missingMarkers = Object.keys(KIND_BY_SLUG).filter(
    (slug) => !topics.some(({ id }) => id === slug),
  );
  const notices = [
    ...duplicates.map(({ id }) => warn(`topic "${id}" appears twice, keeping the first`)),
    ...missingMarkers.map((slug) =>
      warn(`README heading "${slug}" not found, its topic is missing or has a plain kind`),
    ),
  ];
  return { topics, notices };
}
