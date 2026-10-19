export interface NavItem {
  readonly title: string;
  readonly href: string;
  readonly number?: string;
  readonly done?: boolean;
  readonly practiced?: boolean;
  // A count with the text a screen reader hears instead of the bare number.
  readonly badge?: { readonly count: number; readonly label: string };
}

export interface NavSection {
  readonly label?: string;
  readonly items: readonly NavItem[];
}

export interface Heading {
  readonly depth: number;
  readonly slug: string;
  readonly text: string;
}

// "On this page" lists h2 and h3 only (spec 0004).
export const onThisPage = (headings: readonly Heading[]): readonly Heading[] =>
  headings.filter((h) => h.depth === 2 || h.depth === 3);
