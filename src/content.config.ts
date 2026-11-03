import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Long-form, finished writing.
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

// Digital garden: short, evolving notes. Write them in Obsidian, link with [[note-name]].
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

// Things you built: problem, decisions, trade-offs.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    status: z.enum(['active', 'paused', 'done']),
    stack: z.array(z.string()).default([]),
    repo: z.string().url().optional(),
    order: z.number().default(0),
  }),
});

export const collections = { posts, notes, projects };
