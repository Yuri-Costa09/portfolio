import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Long-form, finished writing. Shown as POST in the log feed.
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Short, evolving notes. Shown as NOTE in the log feed. Write them in Obsidian, link with [[note-name]].
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    status: z.enum(['seedling', 'growing', 'evergreen']).default('seedling'),
    tags: z.array(z.string()).default([]),
    updated: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, notes };
