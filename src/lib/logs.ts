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

// English is the default: /logs/<slug>/. A translation lives at
// src/content/translations/<lang>/<slug>.md and is served at /logs/<slug>/<lang>/.
// Key: the URL segment. Value: the <html lang> tag.
export const LANGS = { en: 'en', 'pt-br': 'pt-BR' } as const;
export type Lang = keyof typeof LANGS;
export const DEFAULT_LANG: Lang = 'en';

export interface TranslationLike {
  id: string; // '<lang>/<slug>'
  body?: string;
  data: { title: string; description: string };
}

export interface Translation<T extends TranslationLike = TranslationLike> {
  lang: Lang;
  of: string; // id of the translated post or note
  title: string;
  summary: string;
  href: string;
  body: string;
  entry: T;
}

export interface Version {
  lang: Lang;
  href: string;
}

// A typo in the folder or file name fails the build instead of silently hiding the translation.
export function readTranslations<T extends TranslationLike>(list: T[], logIds: string[]): Translation<T>[] {
  const known = new Set(logIds);
  const others = Object.keys(LANGS).filter((l) => l !== DEFAULT_LANG);
  return list.map((t) => {
    const [lang, ...rest] = t.id.split('/');
    const of = rest.join('/');
    if (!others.includes(lang) || !of) {
      throw new Error(
        `Translation "${t.id}" must be at translations/<lang>/<slug>.md, with <lang> one of: ${others.join(', ')}.`,
      );
    }
    if (!known.has(of)) throw new Error(`Translation "${t.id}" points to "${of}", which is not a post or note.`);
    return {
      lang: lang as Lang,
      of,
      title: t.data.title,
      summary: t.data.description,
      href: `${logHref(of)}${lang}/`,
      body: t.body ?? '',
      entry: t,
    };
  });
}

// The language switch of one log. Empty when it has no translation, so no switch is shown.
export function versionsOf(log: { id: string; href: string }, translations: Translation[]): Version[] {
  const mine = translations.filter((t) => t.of === log.id);
  if (mine.length === 0) return [];
  return [{ lang: DEFAULT_LANG, href: log.href }, ...mine.map((t) => ({ lang: t.lang, href: t.href }))];
}

// What a log page shows in one language. Date, kind and tags always come from the original.
export function localize(log: Log, t?: Translation) {
  if (!t) return { lang: DEFAULT_LANG, title: log.title, summary: log.summary, meta: log.meta };
  const meta = log.kind === 'post' ? `${readingTime(t.body)} min` : log.meta;
  return { lang: t.lang, title: t.title, summary: t.summary, meta };
}
