import { getCollection } from 'astro:content';

const live = (e: { data: { draft?: boolean } }) => import.meta.env.DEV || !e.data.draft;

export async function getPosts() {
  return (await getCollection('posts', live)).sort((a, b) => +b.data.date - +a.data.date);
}

export async function getNotes() {
  return (await getCollection('notes', live)).sort((a, b) => +b.data.updated - +a.data.updated);
}

export async function getProjects() {
  return (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
}

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const statusLabel = {
  seedling: 'Seedling',
  growing: 'Growing',
  evergreen: 'Evergreen',
} as const;
