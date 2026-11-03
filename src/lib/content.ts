import { getCollection } from 'astro:content';
import { mergeLogs, buildTimeline } from './logs';
import { contributions } from '../data/oss';
import { cv } from '../data/cv';

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

// Logs, contributions and job starts, newest first (the hero's `tail ~/log`).
export async function getTimeline() {
  return buildTimeline(await getLogs(), contributions, cv.experience);
}

export const sortedContributions = () => [...contributions].sort((a, b) => b.date.localeCompare(a.date));
