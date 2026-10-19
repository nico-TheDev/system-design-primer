import { defineCollection } from 'astro:content';
import { createContentLoaders } from '@/content-pipeline/loaders';
import { exerciseSchema, topicSchema } from '@/content-pipeline/schemas';

// Both loaders share one snapshot of README.md and solutions/ (spec 0003).
const loaders = createContentLoaders();

const topics = defineCollection({ loader: loaders.topics, schema: topicSchema });
const exercises = defineCollection({ loader: loaders.exercises, schema: exerciseSchema });

export const collections = { topics, exercises };
