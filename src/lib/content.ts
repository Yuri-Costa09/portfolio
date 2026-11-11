import { getCollection } from 'astro:content';
import { mergeLogs, buildTimeline, readTranslations } from './logs';
import { contributions } from '../data/oss';
import { experience } from '../data/experience';

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

// Translations of published logs. Checked against every post and note, drafts included:
// a typo fails the build, while the translation of a draft just waits for it.
export async function getTranslations() {
  const all = [...(await getCollection('posts')), ...(await getCollection('notes'))].map((e) => e.id);
  const published = new Set((await getLogs()).map((l) => l.id));
  return readTranslations(await getCollection('translations', live), all).filter((t) => published.has(t.of));
}

// Logs, contributions and job starts, newest first (the hero's `tail ~/log`).
export async function getTimeline() {
  return buildTimeline(await getLogs(), contributions, experience);
}

export const sortedContributions = () => [...contributions].sort((a, b) => b.date.localeCompare(a.date));
