import type { NavItem, NavSection } from '@/lib/nav';
import { emptyPracticeIndex, type PracticeIndex } from '@/lib/practice';
import { isDone, type DoneIndex } from '@/lib/progress';
import type {
  Exercise,
  ExerciseKind,
  TocHeading,
  Topic,
  TopicKind,
} from '@/content-pipeline/types';

export type Neighbour = {
  readonly number?: number;
  readonly title: string;
  readonly href: string;
};

type PathEntry<K extends string> = {
  readonly id: string;
  readonly title: string;
  readonly kind: K;
  readonly number: number;
  readonly href: string;
  readonly done: boolean;
  readonly prev?: Neighbour | undefined;
  readonly next?: Neighbour | undefined;
};

export type PathTopic = PathEntry<TopicKind>;
export type PathExercise = PathEntry<ExerciseKind> & {
  // Finished practice attempts, and whether a session is open.
  readonly practiced: number;
  readonly practicing: boolean;
};

export type PathGroup<E> = {
  readonly label: string;
  readonly items: readonly E[];
};

export type StudyPath = {
  readonly topics: readonly PathTopic[];
  readonly exercises: readonly PathExercise[];
  readonly topicGroups: readonly PathGroup<PathTopic>[];
  readonly exerciseGroups: readonly PathGroup<PathExercise>[];
  readonly nav: readonly NavSection[];
};

const TOPIC_GROUPS: readonly (readonly [TopicKind, string])[] = [
  ['start-here', 'Start here'],
  ['topic', 'Topics'],
  ['interview-approach', 'Interview approach'],
  ['study-guide', 'Study guide'],
  ['appendix', 'Appendix'],
];

const EXERCISE_GROUPS: readonly (readonly [ExerciseKind, string])[] = [
  ['system-design', 'System design exercises'],
  ['object-oriented', 'Object oriented exercises'],
];

export const EXERCISES_HREF = '/exercises/';

export const practiceHref = (id: string): string => `/exercises/${id}/practice/`;

const byOrder = (a: { readonly order: number }, b: { readonly order: number }) => a.order - b.order;

const toNeighbour = (entry: { number: number; title: string; href: string }): Neighbour => ({
  number: entry.number,
  title: entry.title,
  href: entry.href,
});

// Numbers are 1 to N over the whole sorted list, so every surface prints the same one.
const numbered = <K extends string>(
  sorted: readonly { id: string; title: string; kind: K }[],
  hrefOf: (id: string) => string,
  doneOf: (id: string) => boolean,
): readonly PathEntry<K>[] => {
  const base = sorted.map((entry, index) => ({
    id: entry.id,
    title: entry.title,
    kind: entry.kind,
    number: index + 1,
    href: hrefOf(entry.id),
    done: doneOf(entry.id),
  }));
  return base.map((entry, index) => {
    const before = base[index - 1];
    const after = base[index + 1];
    return {
      ...entry,
      prev: before ? toNeighbour(before) : undefined,
      next: after ? toNeighbour(after) : undefined,
    };
  });
};

const groupBy = <K extends string, E extends { readonly kind: K }>(
  defs: readonly (readonly [K, string])[],
  entries: readonly E[],
): readonly PathGroup<E>[] =>
  defs
    .map(([kind, label]) => ({ label, items: entries.filter((e) => e.kind === kind) }))
    .filter((group) => group.items.length > 0);

const toNavItem = (entry: {
  title: string;
  href: string;
  number: number;
  done: boolean;
  practiced?: number;
}): NavItem => ({
  title: entry.title,
  href: entry.href,
  done: entry.done,
  practiced: (entry.practiced ?? 0) > 0,
  number: String(entry.number),
});

export const buildStudyPath = (
  topics: readonly Topic[],
  exercises: readonly Exercise[],
  doneIndex: DoneIndex = new Map(),
  practiceIndex: PracticeIndex = emptyPracticeIndex,
): StudyPath => {
  const pathTopics = numbered(
    [...topics].sort(byOrder),
    (id) => `/topics/${id}/`,
    (id) => isDone(doneIndex, 'topic', id),
  ) as readonly PathTopic[];
  const pathExercises = numbered(
    [...exercises].sort(byOrder),
    (id) => `/exercises/${id}/`,
    (id) => isDone(doneIndex, 'exercise', id),
  ).map((entry) => ({
    ...entry,
    practiced: practiceIndex.finished.get(entry.id) ?? 0,
    practicing: practiceIndex.open.has(entry.id),
  })) as readonly PathExercise[];

  // The last topic leads on to the exercises, which have no number of their own.
  const topicsWithEnd = pathTopics.map((topic, index) =>
    index === pathTopics.length - 1
      ? { ...topic, next: { title: 'Exercises', href: EXERCISES_HREF } }
      : topic,
  );

  const topicGroups = groupBy(TOPIC_GROUPS, topicsWithEnd);
  const exerciseGroups = groupBy(EXERCISE_GROUPS, pathExercises);
  const nav = [...topicGroups, ...exerciseGroups].map((group) => ({
    label: group.label,
    items: group.items.map(toNavItem),
  }));

  return {
    topics: topicsWithEnd,
    exercises: pathExercises,
    topicGroups,
    exerciseGroups,
    nav,
  };
};

// Moves heading tags up by `by` levels, never above h2 (the page title is the h1) or below h6.
// Only the tag name changes, so ids and text stay as the pipeline wrote them.
export const shiftHeadings = (html: string, by: number): string =>
  html.replace(/<(\/?)h([1-6])(?=[\s>])/g, (_match, slash: string, level: string) => {
    const shifted = Math.min(6, Math.max(2, Number(level) - by));
    return `<${slash}h${shifted}`;
  });

export const toShellHeadings = (headings: readonly TocHeading[], by: number) =>
  headings.map((h) => ({ depth: h.depth - by, text: h.text, slug: h.anchor }));

// README topics start at h2 and appendix topics at h3, so their sub headings sit one and two levels lower.
export const headingShift = (kind: TopicKind): number => (kind === 'appendix' ? 2 : 1);

// "On this page" for an exercise: the problem headings, then each solution section and its own headings.
export const exerciseHeadings = (exercise: Exercise) => [
  ...toShellHeadings(exercise.problemHeadings, 0),
  ...(exercise.split
    ? exercise.solution.flatMap((section) => [
        { depth: 2, text: section.title, slug: section.anchor },
        ...toShellHeadings(section.headings, 0),
      ])
    : []),
];
