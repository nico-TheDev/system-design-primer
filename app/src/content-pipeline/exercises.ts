// Exercises: split one rendered file into a problem and its solution sections.
import {
  bodyBetween,
  hrefsIn,
  locateHeadings,
  nextHeadingIndex,
  tocBetween,
  type HeadingTag,
} from './split-html';
import {
  warn,
  type Exercise,
  type ExerciseKind,
  type Notice,
  type Rendered,
  type SolutionSection,
} from './types';

// Markers match on heading text only, depth 2, ignoring case.
const SOLUTION_MARKER: Readonly<Record<ExerciseKind, RegExp>> = {
  'system-design': /^Step\s*2\b/i,
  'object-oriented': /^Solution$/i,
};

// The two README sections whose tables list the exercises, in README order.
const TABLE_SECTIONS = [
  'system-design-interview-questions-with-solutions',
  'object-oriented-design-interview-questions-with-solutions',
] as const;

export type ExerciseResult = {
  readonly exercise: Exercise;
  readonly notices: readonly Notice[];
};

function wholePage(
  id: string,
  kind: ExerciseKind,
  title: string,
  rendered: Rendered,
  tags: readonly HeadingTag[] | undefined,
  titleIndex: number,
): Exercise {
  const html =
    tags && titleIndex !== -1
      ? bodyBetween(rendered.html, tags, titleIndex, undefined)
      : rendered.html;
  const section: SolutionSection = {
    title: 'Full page',
    anchor: 'full-page',
    html,
    headings: tags ? tocBetween(tags, titleIndex, undefined) : [],
  };
  return {
    id,
    title,
    kind,
    order: 0,
    split: false,
    problem: '',
    problemHeadings: [],
    solution: [section],
  };
}

export function buildExercise(id: string, kind: ExerciseKind, rendered: Rendered): ExerciseResult {
  const tags = locateHeadings(rendered.html, rendered.headings);
  const titleIndex = tags?.findIndex(({ heading }) => heading.depth === 1) ?? -1;
  const title = tags?.[titleIndex]?.heading.text;
  const titleNotice = title === undefined ? [warn(`exercise "${id}" has no title heading`)] : [];
  const name = title ?? id;

  const markerIndex =
    tags?.findIndex(
      ({ heading }) => heading.depth === 2 && SOLUTION_MARKER[kind].test(heading.text),
    ) ?? -1;
  if (!tags || markerIndex === -1) {
    const reason = tags
      ? `no "${kind === 'system-design' ? '## Step 2' : '## Solution'}" heading`
      : 'headings do not match the rendered HTML';
    return {
      exercise: wholePage(id, kind, name, rendered, tags, titleIndex),
      notices: [...titleNotice, warn(`exercise "${id}": ${reason}, showing the whole page`)],
    };
  }

  const problemFrom = titleIndex === -1 ? 0 : tags[titleIndex]?.bodyStart;
  const problem = rendered.html.slice(problemFrom, tags[markerIndex]?.start).trim();
  const problemHeadings = tocBetween(tags, titleIndex, markerIndex);

  // System design: one section per `##` from Step 2. Notebook: one section after `## Solution`.
  const solution: readonly SolutionSection[] =
    kind === 'object-oriented'
      ? [
          {
            title: 'Solution',
            anchor: 'solution',
            html: bodyBetween(rendered.html, tags, markerIndex, undefined),
            headings: tocBetween(tags, markerIndex, undefined),
          },
        ]
      : tags.flatMap(({ heading }, index): readonly SolutionSection[] =>
          index >= markerIndex && heading.depth === 2
            ? [
                {
                  title: heading.text,
                  anchor: heading.slug,
                  html: bodyBetween(rendered.html, tags, index, nextHeadingIndex(tags, index, 2)),
                  headings: tocBetween(tags, index, nextHeadingIndex(tags, index, 2)),
                },
              ]
            : [],
        );

  return {
    exercise: { id, title: name, kind, order: 0, split: true, problem, problemHeadings, solution },
    notices: titleNotice,
  };
}

// Folder names in the order they appear in the README's two exercise tables.
export function tableFolders(rendered: Rendered): {
  readonly folders: readonly string[];
  readonly notices: readonly Notice[];
} {
  const tags = locateHeadings(rendered.html, rendered.headings);
  if (!tags) return { folders: [], notices: [warn('README exercise tables could not be read')] };
  const sections = TABLE_SECTIONS.map((slug) => {
    const index = tags.findIndex(({ heading }) => heading.slug === slug);
    return { slug, index };
  });
  const missing = sections.filter(({ index }) => index === -1);
  const hrefs = sections.flatMap(({ index }) =>
    index === -1
      ? []
      : hrefsIn(bodyBetween(rendered.html, tags, index, nextHeadingIndex(tags, index, 2))),
  );
  const folders = hrefs.flatMap((href) => {
    const match = /(?:^|\/)solutions\/(?:system_design|object_oriented_design)\/([^/#?]+)\//.exec(
      href,
    );
    return match?.[1] ? [match[1]] : [];
  });
  return {
    folders: [...new Set(folders)],
    notices: missing.map(({ slug }) => warn(`README section "${slug}" not found, order unknown`)),
  };
}

// System design first, then table order; folders missing from the tables follow alphabetically.
export function orderExercises(
  exercises: readonly Exercise[],
  folders: readonly string[],
): { readonly exercises: readonly Exercise[]; readonly notices: readonly Notice[] } {
  const ids = new Set(exercises.map(({ id }) => id));
  const rank = (exercise: Exercise): number => {
    const index = folders.indexOf(exercise.id);
    return index === -1 ? folders.length + (exercise.kind === 'system-design' ? 0 : 1) : index;
  };
  const sorted = [...exercises].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  const notices = [
    ...folders
      .filter((folder) => !ids.has(folder))
      .map((folder) => warn(`README lists exercise "${folder}" but no such folder was loaded`)),
    ...exercises
      .filter(({ id }) => !folders.includes(id))
      .map(({ id }) => warn(`exercise "${id}" is not in the README tables, placed last`)),
  ];
  return { exercises: sorted.map((exercise, order) => ({ ...exercise, order })), notices };
}
