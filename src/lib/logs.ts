// Pure helpers behind the log feed, the home timeline and dates.
// No Astro imports, so `npm test` (node --test) runs them directly.
import { slugify } from './wikilinks.mjs';

export type NoteStatus = 'seedling' | 'growing' | 'evergreen';
export type Kind = 'post' | 'note' | 'oss' | 'job';

export interface PostLike {
  id: string;
  body?: string;
  data: { title: string; description: string; date: Date; updated?: Date; tags?: string[] };
}

export interface NoteLike {
  id: string;
  body?: string;
  data: { title: string; summary: string; status: NoteStatus; updated: Date; tags?: string[] };
}

interface LogBase {
  id: string;
  title: string;
  summary: string;
  date: Date;
  href: string;
  meta: string;
  body: string;
}

export interface PostLog<P extends PostLike = PostLike> extends LogBase {
  kind: 'post';
  entry: P;
}

export interface NoteLog<N extends NoteLike = NoteLike> extends LogBase {
  kind: 'note';
  entry: N;
}

export type Log<P extends PostLike = PostLike, N extends NoteLike = NoteLike> = PostLog<P> | NoteLog<N>;

export interface ContributionLike {
  repo: string;
  number: number;
  status: 'merged' | 'open';
  date: string;
  url: string;
}

export interface JobLike {
  org: string;
  start: string;
}

export interface TimelineItem {
  date: Date;
  kind: Kind;
  label: string;
  href: string;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const WIKILINK = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

export const logHref = (id: string) => `/logs/${id}/`;

export const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

export function parseDay(s: string): Date {
  if (!DAY.test(s)) throw new Error(`Invalid date "${s}". Use YYYY-MM-DD.`);
  return new Date(`${s}T00:00:00Z`);
}

export function parseMonth(s: string): Date {
  if (!MONTH.test(s)) throw new Error(`Invalid month "${s}". Use YYYY-MM.`);
  return new Date(`${s}-01T00:00:00Z`);
}

export function fmtPeriod(start: string, end?: string): string {
  parseMonth(start);
  if (end) parseMonth(end);
  return `${start} → ${end ?? 'now'}`;
}

export const yearsSince = (start: string, now = new Date()) =>
  Math.round((+now - +parseMonth(start)) / YEAR_MS);

export function readingTime(body = ''): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

// Posts and notes in one feed, newest first. A slug used by both would collide at /logs/<slug>/.
export function mergeLogs<P extends PostLike, N extends NoteLike>(posts: P[], notes: N[]): Log<P, N>[] {
  const postIds = new Set(posts.map((p) => p.id));
  for (const n of notes) {
    if (postIds.has(n.id)) {
      throw new Error(`Log slug "${n.id}" exists in both posts and notes. Rename one of them.`);
    }
  }
  const logs: Log<P, N>[] = [
    ...posts.map(
      (p): PostLog<P> => ({
        kind: 'post',
        id: p.id,
        title: p.data.title,
        summary: p.data.description,
        date: p.data.date,
        href: logHref(p.id),
        meta: `${readingTime(p.body)} min`,
        body: p.body ?? '',
        entry: p,
      }),
    ),
    ...notes.map(
      (n): NoteLog<N> => ({
        kind: 'note',
        id: n.id,
        title: n.data.title,
        summary: n.data.summary,
        date: n.data.updated,
        href: logHref(n.id),
        meta: n.data.status,
        body: n.body ?? '',
        entry: n,
      }),
    ),
  ];
  return logs.sort((a, b) => +b.date - +a.date);
}

export const linkTargets = (body = '') => [...body.matchAll(WIKILINK)].map((m) => slugify(m[1]));

export const backlinks = <L extends { id: string; body: string }>(target: { id: string }, logs: L[]): L[] =>
  logs.filter((l) => l.id !== target.id && linkTargets(l.body).includes(target.id));

// Everything that happened, for the hero's `tail ~/log` box.
export function buildTimeline(logs: Log[], contributions: ContributionLike[], jobs: JobLike[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...logs.map((l) => ({ date: l.date, kind: l.kind, label: l.title, href: l.href })),
    ...contributions.map((c) => ({
      date: parseDay(c.date),
      kind: 'oss' as const,
      label: `${c.repo.split('/').pop()}#${c.number} ${c.status}`,
      href: c.url,
    })),
    ...jobs.map((j) => ({
      date: parseMonth(j.start),
      kind: 'job' as const,
      label: `joined ${j.org}`,
      href: '/#experience',
    })),
  ];
  return items.sort((a, b) => +b.date - +a.date);
}

export function ossSummary(list: { repo: string; status: 'merged' | 'open' }[]): string {
  const merged = list.filter((c) => c.status === 'merged').length;
  const repos = new Set(list.map((c) => c.repo)).size;
  return `${merged} merged · ${repos} repo${repos === 1 ? '' : 's'}`;
}
