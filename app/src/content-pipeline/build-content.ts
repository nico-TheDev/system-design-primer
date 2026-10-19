// Turns the files read from the repo into topics and exercises. No file access here:
// the markdown renderer is passed in, so this stays testable without Astro.
import { buildExercise, orderExercises, tableFolders } from './exercises';
import { buildImgurMap, buildTopicMap, rewriteContent, type LinkContext } from './links';
import { notebookToMarkdown } from './notebook';
import { buildTopics } from './topics';
import {
  warn,
  type Content,
  type Exercise,
  type ExerciseKind,
  type Notice,
  type Rendered,
} from './types';

export type ExerciseSource = {
  readonly id: string;
  // Repo relative folder, for example `solutions/system_design/pastebin`.
  readonly dir: string;
  // Repo relative file that was read, used in messages.
  readonly path: string;
  readonly text: string;
};

export type RepoSources = {
  readonly readme: string;
  readonly systemDesign: readonly ExerciseSource[];
  readonly objectOriented: readonly ExerciseSource[];
  // Repo relative paths of every image file under `images/` and `solutions/`.
  readonly imageFiles: readonly string[];
  // Problems found while reading (unreadable files, extra notebooks).
  readonly notices: readonly Notice[];
};

export type Render = (markdown: string) => Promise<Rendered>;

type Loaded = {
  readonly source: ExerciseSource;
  readonly kind: ExerciseKind;
  readonly rendered: Rendered;
};

async function loadExercise(
  source: ExerciseSource,
  kind: ExerciseKind,
  render: Render,
): Promise<Loaded | Notice> {
  if (kind === 'system-design') return { source, kind, rendered: await render(source.text) };
  const notebook = notebookToMarkdown(source.path, source.text);
  if (!notebook.ok) return notebook.notice;
  return { source, kind, rendered: await render(notebook.markdown) };
}

const isLoaded = (value: Loaded | Notice): value is Loaded => 'rendered' in value;

export async function buildContent(sources: RepoSources, render: Render): Promise<Content> {
  const readme = await render(sources.readme);
  const { topics: draftTopics, notices: topicNotices } = buildTopics(readme);

  const requested = [
    ...sources.systemDesign.map((source) => ({ source, kind: 'system-design' as const })),
    ...sources.objectOriented.map((source) => ({ source, kind: 'object-oriented' as const })),
  ];
  const results = await Promise.all(
    requested.map(({ source, kind }) => loadExercise(source, kind, render)),
  );
  const loaded = results.filter(isLoaded);
  // Two folders with the same name: the system design one comes first and wins.
  const unique = loaded.filter(
    (item, index) => loaded.findIndex(({ source }) => source.id === item.source.id) === index,
  );
  const duplicateNotices = loaded
    .filter((item) => !unique.includes(item))
    .map(({ source }) =>
      warn(`exercise "${source.id}" exists twice, keeping the system design one`),
    );

  const built = unique.map(({ source, kind, rendered }) => ({
    source,
    rendered,
    ...buildExercise(source.id, kind, rendered),
  }));
  const tables = tableFolders(readme);
  const ordered = orderExercises(
    built.map(({ exercise }) => exercise),
    tables.folders,
  );

  const base: Omit<LinkContext, 'sourceDir' | 'ownSlugs'> = {
    topicBySlug: buildTopicMap(draftTopics),
    readmeSlugs: new Set(readme.headings.map(({ slug }) => slug)),
    appendixTopicId: draftTopics.find(({ kind }) => kind === 'appendix')?.id,
    exerciseIds: new Set(ordered.exercises.map(({ id }) => id)),
    imgurFiles: buildImgurMap(sources.imageFiles),
    imageFiles: new Set(sources.imageFiles),
  };

  const topicRewrites = draftTopics.map((topic) => {
    const { html, notices } = rewriteContent(topic.html, {
      ...base,
      sourceDir: '',
      ownSlugs: undefined,
    });
    return { topic: { ...topic, html }, notices };
  });

  const exerciseRewrites = ordered.exercises.map((exercise) => {
    const item = built.find(({ source }) => source.id === exercise.id);
    const context: LinkContext = {
      ...base,
      sourceDir: item?.source.dir ?? '',
      ownSlugs: new Set(item?.rendered.headings.map(({ slug }) => slug)),
    };
    return rewriteExercise(exercise, context);
  });

  return {
    topics: topicRewrites.map(({ topic }) => topic),
    exercises: exerciseRewrites.map(({ exercise }) => exercise),
    notices: [
      ...sources.notices,
      ...results.filter((value): value is Notice => !isLoaded(value)),
      ...topicNotices,
      ...duplicateNotices,
      ...built.flatMap(({ notices }) => notices),
      ...tables.notices,
      ...ordered.notices,
      ...topicRewrites.flatMap(({ notices }) => notices),
      ...exerciseRewrites.flatMap(({ notices }) => notices),
    ],
  };
}

function rewriteExercise(
  exercise: Exercise,
  context: LinkContext,
): { readonly exercise: Exercise; readonly notices: readonly Notice[] } {
  const problem = rewriteContent(exercise.problem, context);
  const sections = exercise.solution.map((section) => ({
    section,
    ...rewriteContent(section.html, context),
  }));
  return {
    exercise: {
      ...exercise,
      problem: problem.html,
      solution: sections.map(({ section, html }) => ({ ...section, html })),
    },
    notices: [...problem.notices, ...sections.flatMap(({ notices }) => notices)],
  };
}
