import { getCollection } from 'astro:content';
import { mergeLogs } from './logs';

// Drafts show up in `npm run dev` only.
const live = (e: { data: { draft?: boolean } }) => import.meta.env.DEV || !e.data.draft;

export async function getPosts() {
  return getCollection('posts', live);
}

export async function getNotes() {
  return getCollection('notes', live);
}

// Posts and notes as one feed, newest first. Throws if a slug exists in both.
export async function getLogs() {
  return mergeLogs(await getPosts(), await getNotes());
}
