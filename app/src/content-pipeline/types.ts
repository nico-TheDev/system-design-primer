// Shapes shared by the content pipeline. Plain `type` aliases so they fit Astro's data store.

export type Notice = {
  readonly level: 'warn' | 'error';
  readonly message: string;
  // Notices with the same key are logged once per sync.
  readonly key: string;
};

export const warn = (message: string, key: string = message): Notice => ({
  level: 'warn',
  message,
  key,
});

export const failure = (message: string, key: string = message): Notice => ({
  level: 'error',
  message,
  key,
});

// Heading as reported by Astro's markdown renderer (`slug` is the id on the heading tag).
export type RenderedHeading = {
  readonly depth: number;
  readonly slug: string;
  readonly text: string;
};

export type Rendered = {
  readonly html: string;
  readonly headings: readonly RenderedHeading[];
};

export type TocHeading = {
  readonly depth: number;
  readonly text: string;
  readonly anchor: string;
};

export type TopicKind = 'start-here' | 'topic' | 'interview-approach' | 'study-guide' | 'appendix';

export type Topic = {
  readonly id: string;
  readonly title: string;
  readonly kind: TopicKind;
  readonly order: number;
  readonly html: string;
  readonly headings: readonly TocHeading[];
};

export type ExerciseKind = 'system-design' | 'object-oriented';

export type SolutionSection = {
  readonly title: string;
  readonly anchor: string;
  readonly html: string;
  readonly headings: readonly TocHeading[];
};

export type Exercise = {
  readonly id: string;
  readonly title: string;
  readonly kind: ExerciseKind;
  readonly order: number;
  // False when the problem and solution split fell back to one whole page.
  readonly split: boolean;
  readonly problem: string;
  readonly problemHeadings: readonly TocHeading[];
  readonly solution: readonly SolutionSection[];
};

export type Content = {
  readonly topics: readonly Topic[];
  readonly exercises: readonly Exercise[];
  readonly notices: readonly Notice[];
};
