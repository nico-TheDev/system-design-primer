import { getCollection } from 'astro:content';
import { listDone } from '@/db/progress';
import { toDoneIndex } from '@/lib/progress';
import { buildStudyPath } from '@/lib/study-path';

// The one place that reads the collections and the done marks; pages call it once per request.
export const loadStudyPath = async () => {
  const [topics, exercises] = await Promise.all([
    getCollection('topics'),
    getCollection('exercises'),
  ]);
  const index = toDoneIndex(listDone());
  return {
    path: buildStudyPath(
      topics.map((entry) => entry.data),
      exercises.map((entry) => entry.data),
      index,
    ),
    index,
  };
};
