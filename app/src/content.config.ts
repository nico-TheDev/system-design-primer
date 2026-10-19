import { defineCollection } from 'astro:content';
import { createCardLoader } from '@/content-pipeline/card-loader';
import { createContentLoaders } from '@/content-pipeline/loaders';
import { cardSchema, exerciseSchema, topicSchema } from '@/content-pipeline/schemas';

// Both loaders share one snapshot of README.md and solutions/ (spec 0003).
const loaders = createContentLoaders();

const topics = defineCollection({ loader: loaders.topics, schema: topicSchema });
const exercises = defineCollection({ loader: loaders.exercises, schema: exerciseSchema });
// The Anki decks in resources/flash_cards/ (spec 0008).
const cards = defineCollection({ loader: createCardLoader(), schema: cardSchema });

export const collections = { topics, exercises, cards };
