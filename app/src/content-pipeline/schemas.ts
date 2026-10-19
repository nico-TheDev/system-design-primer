import { z } from 'astro/zod';
import type { Card, Exercise, Topic } from './types';

const tocHeading = z.object({ depth: z.number(), text: z.string(), anchor: z.string() });

export const topicSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(['start-here', 'topic', 'interview-approach', 'study-guide', 'appendix']),
  order: z.number().int(),
  html: z.string(),
  headings: z.array(tocHeading),
}) satisfies z.ZodType<Topic>;

export const exerciseSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(['system-design', 'object-oriented']),
  order: z.number().int(),
  split: z.boolean(),
  problem: z.string(),
  problemHeadings: z.array(tocHeading),
  solution: z.array(
    z.object({
      title: z.string(),
      anchor: z.string(),
      html: z.string(),
      headings: z.array(tocHeading),
    }),
  ),
}) satisfies z.ZodType<Exercise>;

export const cardSchema = z.object({
  id: z.string(),
  deck: z.string(),
  deckTitle: z.string(),
  guid: z.string(),
  order: z.number().int(),
  title: z.string().min(1),
  backHtml: z.string(),
}) satisfies z.ZodType<Card>;
