# Portfolio "log stream" Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the light/blue portfolio with a dark-only, all-monospace "log stream" site showing logs (posts + notes), experience, open source contributions and links.

**Architecture:** Same Astro project. Pure logic (merging posts and notes, timeline, dates, backlinks) moves into `src/lib/logs.ts`, which has no Astro imports so it can be tested with Node's built-in test runner. Astro-specific data access stays in `src/lib/content.ts`. Each home section is a small component. Old pages (`/writing`, `/notes`, `/projects`) are deleted and replaced by `/logs/` and `/logs/<id>/`.

**Tech Stack:** Astro 7.4, content collections (glob loader), remark plugin for `[[wikilinks]]`, Shiki (`vesper` theme), `@fontsource-variable/jetbrains-mono`, `@astrojs/rss`, `@astrojs/sitemap`, `node --test` (Node 22.23, native TypeScript type stripping, no test dependency).

**Spec:** `docs/superpowers/specs/2026-11-03-portfolio-redesign-design.md`
**Approved mockup:** `docs/superpowers/specs/2026-11-03-portfolio-redesign-mockup.html`

**Working rules**
- Branch: `redesign` (already created). Commit after each task.
- Every commit message ends with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Node type stripping only supports erasable TypeScript: no `enum`, no `namespace`, no constructor parameter properties in `src/lib/logs.ts` or in tests.
- After every task, `npm run build` must pass. Tasks 3–5 leave the site visually half-done on purpose; that's expected.

---

## File map

| File | Responsibility |
| --- | --- |
| `src/lib/logs.ts` (new) | Pure helpers: date parsing and formatting, reading time, `mergeLogs`, `backlinks`, `buildTimeline`, `ossSummary`. Types `Log`, `TimelineItem`. |
| `src/lib/wikilinks.mjs` | Remark plugin: `[[x]]` → `/logs/x/`, titles from posts and notes, missing targets → plain `<span>`. Exports `slugify`. |
| `src/lib/content.ts` | Astro data access: `getPosts`, `getNotes`, `getLogs`, `getTimeline`, `sortedContributions`. |
| `src/config.ts` | Name, tagline, intro, status, links. |
| `src/data/cv.ts` | Experience (with `start`/`end`), skills, languages, education. Type `Job`. |
| `src/data/oss.ts` (new) | Hand-curated contributions. Type `Contribution`. |
| `src/styles/global.css` | Dark tokens, base, `.kind-*` colours. |
| `src/layouts/Base.astro` | `<head>`, prompt + nav, `-- EOF --` footer. |
| `src/layouts/LogLayout.astro` (new) | Single log page: meta line, title, prose styles, "linked from". |
| `src/components/SectionHead.astro` (new) | `01 experience ──── meta` header. |
| `src/components/Tail.astro` (new) | Hero `tail ~/log` box. |
| `src/components/LogList.astro` (new) | Log rows (home, `/logs/`, "linked from"). |
| `src/components/Experience.astro` (new) | Jobs + `↓ cv.pdf`. |
| `src/components/OssList.astro` (new) | PR rows. |
| `src/components/Links.astro` (new) | `$ cmd` links grid. |
| `src/pages/index.astro` | Home. |
| `src/pages/logs/index.astro` (new) | All logs. |
| `src/pages/logs/[...slug].astro` (new) | One log. |
| `src/pages/cv.astro` | Standalone print page for the PDF. |
| `src/pages/404.astro` | `bash: cd: …` page. |
| `src/pages/rss.xml.js` | Feed of all logs. |
| `test/logs.test.ts`, `test/wikilinks.test.ts` (new) | Unit tests. |

---

### Task 1: Pure log helpers with tests

**Files:**
- Create: `src/lib/logs.ts`
- Create: `test/logs.test.ts`
- Modify: `package.json` (add `test` script)

- [ ] **Step 1: Add the test script**

In `package.json`, replace the `scripts` block with:

```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "node --disable-warning=ExperimentalWarning --test test/*.test.ts"
  },
```

- [ ] **Step 2: Write the failing tests**

Create `test/logs.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readingTime,
  fmtDate,
  parseDay,
  parseMonth,
  fmtPeriod,
  fmtPeriodLong,
  yearsSince,
  mergeLogs,
  backlinks,
  buildTimeline,
  ossSummary,
} from '../src/lib/logs.ts';

const post = (id: string, date: string, body = 'word '.repeat(440)) => ({
  id,
  body,
  data: { title: `Post ${id}`, description: `About ${id}`, date: new Date(date), tags: [] as string[] },
});

const note = (
  id: string,
  updated: string,
  body = '',
  status: 'seedling' | 'growing' | 'evergreen' = 'seedling',
) => ({
  id,
  body,
  data: { title: `Note ${id}`, summary: `Sum ${id}`, status, updated: new Date(updated), tags: [] as string[] },
});

test('readingTime: 220 words per minute, at least 1', () => {
  assert.equal(readingTime(''), 1);
  assert.equal(readingTime(undefined), 1);
  assert.equal(readingTime('word '.repeat(440)), 2);
});

test('fmtDate: ISO day in UTC', () => {
  assert.equal(fmtDate(new Date('2026-10-30T23:30:00Z')), '2026-10-30');
});

test('parseDay and parseMonth: strict formats, UTC', () => {
  assert.equal(parseDay('2026-10-24').toISOString(), '2026-10-24T00:00:00.000Z');
  assert.equal(parseMonth('2026-01').toISOString(), '2026-01-01T00:00:00.000Z');
  assert.throws(() => parseDay('24/10/2026'), /Invalid date "24\/10\/2026"/);
  assert.throws(() => parseMonth('TODO'), /Invalid month "TODO"/);
});

test('fmtPeriod and fmtPeriodLong', () => {
  assert.equal(fmtPeriod('2026-01'), '2026-01 → now');
  assert.equal(fmtPeriod('2023-06', '2025-12'), '2023-06 → 2025-12');
  assert.equal(fmtPeriodLong('2026-01'), 'Jan 2026 — present');
  assert.equal(fmtPeriodLong('2023-06', '2025-12'), 'Jun 2023 — Dec 2025');
  assert.throws(() => fmtPeriod('2026'), /Invalid month "2026"/);
});

test('yearsSince: rounded whole years', () => {
  const now = new Date('2026-11-03T00:00:00Z');
  assert.equal(yearsSince('2023-01', now), 4); // 3.84
  assert.equal(yearsSince('2024-06', now), 2); // 2.42
  assert.equal(yearsSince('2026-06', now), 0); // 0.42
});

test('mergeLogs: one feed, newest first, kind-specific fields', () => {
  const logs = mergeLogs([post('a', '2026-10-20')], [note('b', '2026-10-30', '', 'growing')]);
  assert.deepEqual(
    logs.map((l) => [l.kind, l.id]),
    [
      ['note', 'b'],
      ['post', 'a'],
    ],
  );
  const [n, p] = logs;
  assert.equal(n.summary, 'Sum b');
  assert.equal(n.meta, 'growing');
  assert.equal(n.href, '/logs/b/');
  assert.equal(p.summary, 'About a');
  assert.equal(p.meta, '2 min');
  assert.equal(p.href, '/logs/a/');
});

test('mergeLogs: same slug in posts and notes fails the build', () => {
  assert.throws(
    () => mergeLogs([post('mvcc', '2026-10-20')], [note('mvcc', '2026-10-30')]),
    /Log slug "mvcc" exists in both posts and notes\. Rename one of them\./,
  );
});

test('backlinks: logs whose body links here, by slug, excluding itself', () => {
  const logs = mergeLogs(
    [post('latency', '2026-10-28', 'See [[Cache lines|the note]].')],
    [note('cache-lines', '2026-10-25', 'Self link [[cache-lines]]'), note('mvcc', '2026-10-30', 'nothing')],
  );
  const target = logs.find((l) => l.id === 'cache-lines')!;
  assert.deepEqual(
    backlinks(target, logs).map((l) => l.id),
    ['latency'],
  );
});

test('buildTimeline: logs, contributions and jobs, newest first', () => {
  const logs = mergeLogs([post('a', '2026-10-20')], []);
  const items = buildTimeline(
    logs,
    [
      {
        repo: 'prometheus/client_golang',
        number: 1532,
        status: 'merged',
        date: '2026-10-24',
        url: 'https://github.com/prometheus/client_golang/pull/1532',
      },
    ],
    [{ org: 'Mercado Livre', start: '2026-01' }],
  );
  assert.deepEqual(
    items.map((i) => [i.kind, i.label, i.href]),
    [
      ['oss', 'client_golang#1532 merged', 'https://github.com/prometheus/client_golang/pull/1532'],
      ['post', 'Post a', '/logs/a/'],
      ['job', 'joined Mercado Livre', '/#experience'],
    ],
  );
});

test('ossSummary: merged count and distinct repos', () => {
  const c = (repo: string, status: 'merged' | 'open') => ({ repo, status });
  assert.equal(ossSummary([c('a/x', 'merged'), c('a/x', 'merged'), c('b/y', 'open')]), '2 merged · 2 repos');
  assert.equal(ossSummary([c('a/x', 'merged')]), '1 merged · 1 repo');
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, error like `Cannot find module '.../src/lib/logs.ts'`.

- [ ] **Step 4: Implement `src/lib/logs.ts`**

```ts
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
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

function longMonth(s: string): string {
  const d = parseMonth(s);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export const fmtPeriodLong = (start: string, end?: string) =>
  `${longMonth(start)} — ${end ? longMonth(end) : 'present'}`;

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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: `# pass 10`, `# fail 0`.

- [ ] **Step 6: Build still passes**

Run: `npm run build`
Expected: ends with `Complete!` (nothing imports `logs.ts` yet).

- [ ] **Step 7: Commit**

```bash
git add package.json src/lib/logs.ts test/logs.test.ts
git commit -m "Add pure log helpers with node:test tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Wikilinks point to /logs/ and skip missing targets

**Files:**
- Modify: `src/lib/wikilinks.mjs` (full rewrite)
- Create: `test/wikilinks.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/wikilinks.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wikilinks, slugify } from '../src/lib/wikilinks.mjs';

const para = (value: string): any => ({
  type: 'root',
  children: [{ type: 'paragraph', children: [{ type: 'text', value }] }],
});

test('slugify', () => {
  assert.equal(slugify('Cache lines'), 'cache-lines');
  assert.equal(slugify('  Ação Rápida! '), 'acao-rapida');
});

test('known target becomes a /logs/ link, using the title as text', () => {
  const tree = para('See [[Cache lines]] and [[mvcc|snapshots]].');
  wikilinks({
    titles: new Map([
      ['cache-lines', 'Cache lines'],
      ['mvcc', 'MVCC'],
    ]),
  })(tree);
  const kids = tree.children[0].children;
  assert.deepEqual(
    kids.map((k: any) => k.type),
    ['text', 'link', 'text', 'link', 'text'],
  );
  assert.equal(kids[1].url, '/logs/cache-lines/');
  assert.equal(kids[1].children[0].value, 'cache lines');
  assert.deepEqual(kids[1].data.hProperties, { className: ['wikilink'] });
  assert.equal(kids[3].url, '/logs/mvcc/');
  assert.equal(kids[3].children[0].value, 'snapshots');
});

test('unknown target becomes plain text, not a dead link', () => {
  const tree = para('Later: [[Write skew]].');
  wikilinks({ titles: new Map() })(tree);
  const missing = tree.children[0].children[1];
  assert.equal(missing.type, 'emphasis');
  assert.equal(missing.data.hName, 'span');
  assert.deepEqual(missing.data.hProperties, { className: ['wikilink-missing'] });
  assert.equal(missing.children[0].value, 'Write skew');
});

test('text without wikilinks is left alone', () => {
  const tree = para('No links here.');
  wikilinks({ titles: new Map() })(tree);
  assert.deepEqual(tree.children[0].children, [{ type: 'text', value: 'No links here.' }]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL on `known target…` (URL is `/notes/cache-lines/`) and `unknown target…` (it is a `link`, not `emphasis`).

- [ ] **Step 3: Rewrite `src/lib/wikilinks.mjs`**

```js
// Turns Obsidian-style [[name]] and [[name|label]] into links to /logs/<slug>/.
// Works for posts and notes, so you can write in Obsidian and publish unchanged.
// A target that doesn't exist (yet) renders as plain text instead of a dead link.
import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

const WIKILINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const DIRS = ['src/content/posts', 'src/content/notes'];

export function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// slug -> title, from the frontmatter of every post and note.
function logTitles() {
  const titles = new Map();
  for (const dir of DIRS.map((d) => path.resolve(d))) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const name = file.replace(/\.md$/, '');
      const m = fs.readFileSync(path.join(dir, file), 'utf8').match(/^title:\s*["']?(.+?)["']?\s*$/m);
      titles.set(slugify(name), m ? m[1] : name);
    }
  }
  return titles;
}

// "Cache lines" reads as "cache lines" mid-sentence; acronyms like "MVCC" stay as they are.
const inline = (t) => (t && !/^[A-Z]{2}/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);

export function wikilinks(options = {}) {
  return (tree) => {
    const titles = options.titles ?? logTitles();
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === undefined || !node.value.includes('[[')) return;

      const parts = [];
      let last = 0;
      for (const m of node.value.matchAll(WIKILINK)) {
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) });
        const slug = slugify(m[1]);
        if (titles.has(slug)) {
          parts.push({
            type: 'link',
            url: `/logs/${slug}/`,
            data: { hProperties: { className: ['wikilink'] } },
            children: [{ type: 'text', value: (m[2] ?? inline(titles.get(slug))).trim() }],
          });
        } else {
          parts.push({
            type: 'emphasis',
            data: { hName: 'span', hProperties: { className: ['wikilink-missing'] } },
            children: [{ type: 'text', value: (m[2] ?? m[1]).trim() }],
          });
        }
        last = m.index + m[0].length;
      }
      if (parts.length === 0) return;
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) });

      parent.children.splice(index, 1, ...parts);
      return index + parts.length;
    });
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: `# pass 14`, `# fail 0`.

- [ ] **Step 5: Build still passes**

Run: `npm run build`
Expected: `Complete!`. (Links inside notes now point to `/logs/...`, which doesn't exist until Task 6. Expected.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/wikilinks.mjs test/wikilinks.test.ts
git commit -m "Point wikilinks at /logs/ and render missing targets as text

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Remove the old sections and add `getLogs`

**Files:**
- Delete: `src/pages/writing/`, `src/pages/notes/`, `src/pages/projects/`, `src/content/projects/`, `src/components/PostList.astro`, `src/components/NoteList.astro`, `src/components/ProjectList.astro`, `src/components/LatencyLadder.astro`, `src/layouts/Article.astro`, `src/layouts/ListPage.astro`
- Modify: `src/content.config.ts`, `src/lib/content.ts`, `src/pages/rss.xml.js`
- Modify: `src/pages/index.astro` (temporary stub, replaced in Task 5)

- [ ] **Step 1: Delete the old files**

```bash
git rm -r -q src/pages/writing src/pages/notes src/pages/projects src/content/projects \
  src/components/PostList.astro src/components/NoteList.astro src/components/ProjectList.astro \
  src/components/LatencyLadder.astro src/layouts/Article.astro src/layouts/ListPage.astro
```

- [ ] **Step 2: Drop the `projects` collection**

Replace `src/content.config.ts` with:

```ts
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
```

- [ ] **Step 3: Rewrite `src/lib/content.ts`**

```ts
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
```

- [ ] **Step 4: RSS from the log feed**

Replace `src/pages/rss.xml.js` with:

```js
import rss from '@astrojs/rss';
import { getLogs } from '../lib/content';
import { site } from '../config';

export async function GET(context) {
  const logs = await getLogs();
  return rss({
    title: site.title,
    description: site.description,
    site: context.site,
    items: logs.map((l) => ({
      title: l.title,
      description: l.summary,
      pubDate: l.date,
      link: l.href,
      categories: [l.kind],
    })),
  });
}
```

- [ ] **Step 5: Temporary home stub**

Replace `src/pages/index.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base>
  <div class="wrap"><p>Rebuilding.</p></div>
</Base>
```

- [ ] **Step 6: Verify**

Run: `npm test && npm run build`
Expected: tests pass; build `Complete!`. Then:

Run: `grep -o '<link>[^<]*/logs/[^<]*</link>' dist/rss.xml | wc -l && ls dist`
Expected: `6` (2 posts + 4 notes); `dist` has no `writing`, `notes` or `projects` folder.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Remove writing/notes/projects sections; feed RSS from merged logs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Data model (config, experience dates, open source) and the print CV

**Files:**
- Modify: `src/config.ts`, `src/data/cv.ts`, `src/lib/content.ts`, `src/pages/cv.astro`
- Create: `src/data/oss.ts`

- [ ] **Step 1: Rewrite `src/config.ts`**

```ts
// Everything personal lives here, in src/data/cv.ts and in src/data/oss.ts.
export const site = {
  name: 'Yuri',
  title: 'Yuri — software engineer',
  description:
    'Backend engineer heading toward low-level and distributed systems. Writing to understand how programs actually run.',
  // The "// ..." line above the name.
  tagline: 'backend engineer → low-level & distributed systems',
  intro:
    'Go in production at Mercado Livre scale. I write to understand how programs actually run, from the cache line to the network.',
  // Optional status with a green dot, e.g. 'open to work'. Leave undefined to hide it.
  available: undefined as string | undefined,
  facts: ['São Paulo, BR', 'open to relocation'],
  // Shown as `$ cmd   label` in the links section. Add or remove freely.
  links: [
    { cmd: 'open github', label: 'github.com/your-handle', href: 'https://github.com/your-handle' }, // TODO
    { cmd: 'open linkedin', label: 'linkedin.com/in/your-handle', href: 'https://www.linkedin.com/in/your-handle' }, // TODO
    { cmd: 'mail', label: 'you@yourdomain.dev', href: 'mailto:you@yourdomain.dev' }, // TODO
    { cmd: 'curl cv.pdf', label: 'download', href: '/cv.pdf' },
    { cmd: 'curl rss.xml', label: 'feed', href: '/rss.xml' },
  ],
};
```

- [ ] **Step 2: Structured dates in `src/data/cv.ts`**

Replace the file with:

```ts
// Single source for the home "experience" section, the /cv/ print page and the PDF (scripts/cv_pdf.py).
// Bullets read best as: what you did, at what scale, with what result.

export interface Job {
  role: string;
  org: string;
  start: string; // 'YYYY-MM'
  end?: string; // 'YYYY-MM'; leave out for your current job
  bullets: string[];
}

export const cv = {
  headline: 'Software engineer · Backend, Go',
  location: 'São Paulo, Brazil · open to relocation',
  summary:
    'Backend engineer with about three years of professional experience, building production services in Go. Going deep on low-level systems and distributed systems: memory, concurrency, databases and networks.',

  experience: [
    {
      role: 'Software Engineer',
      org: 'Mercado Livre',
      start: '2026-01', // TODO: real start month
      bullets: [
        'Backend services in Go running in production at high scale.',
        'TODO: what you own, the scale it runs at, and one result you can point to.',
        'TODO: a design decision you wrote and drove (an ADR, a migration, a reliability fix).',
      ],
    },
    {
      role: 'TODO: previous role',
      org: 'TODO: company',
      start: '2023-06', // TODO
      end: '2025-12', // TODO
      bullets: ['TODO: one or two bullets.'],
    },
  ] as Job[],

  skills: [
    { area: 'Languages', items: ['Go', 'Python', 'C++', 'SQL'] },
    { area: 'Systems', items: ['Distributed systems', 'Concurrency', 'Databases', 'Messaging and queues'] },
    { area: 'Infrastructure', items: ['AWS', 'Containers', 'Observability'] },
  ],

  languages: [
    { name: 'Portuguese', level: 'Native' },
    { name: 'English', level: 'Fluent' },
    { name: 'Spanish', level: 'Working proficiency' },
  ],

  education: [
    // { degree: 'TODO', school: 'TODO', period: 'TODO' },
  ] as { degree: string; school: string; period: string }[],
};
```

- [ ] **Step 3: Create `src/data/oss.ts`**

```ts
// Open source contributions: PRs to other people's projects, curated by hand.
// Order doesn't matter (the site sorts newest first). An empty list hides the section and the nav link.

export interface Contribution {
  repo: string; // 'owner/name'
  number: number; // PR number
  title: string;
  url: string;
  status: 'merged' | 'open';
  date: string; // 'YYYY-MM-DD': merge date, or the day it was opened if still open
  impact: string; // one sentence: what changed and why it mattered
  additions?: number; // shown as +N
  deletions?: number; // shown as −N
}

export const contributions: Contribution[] = [
  // {
  //   repo: 'owner/name',
  //   number: 123,
  //   title: 'fix: what the PR did',
  //   url: 'https://github.com/owner/name/pull/123',
  //   status: 'merged',
  //   date: '2026-10-24',
  //   impact: 'One sentence on what changed and why it mattered.',
  //   additions: 42,
  //   deletions: 7,
  // },
];
```

- [ ] **Step 4: Add `getTimeline` and `sortedContributions` to `src/lib/content.ts`**

Replace the file with:

```ts
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
```

- [ ] **Step 5: Rewrite `src/pages/cv.astro` as a standalone print page**

```astro
---
// Print-only page. scripts/cv_pdf.py renders it to public/cv.pdf.
// Not linked from the site, not indexed, kept out of the sitemap (astro.config.mjs).
import { site } from '../config';
import { cv } from '../data/cv';
import { fmtPeriodLong } from '../lib/logs';

const find = (needle: string) => site.links.find((l) => l.href.includes(needle));
const contacts = [find('mailto:'), find('github.com'), find('linkedin.com')].filter((l) => l !== undefined);
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>{site.name} · CV</title>
  </head>
  <body>
    <main class="cv">
      <header class="top">
        <div>
          <h1>{site.name}</h1>
          <p class="headline">{cv.headline}</p>
          <p class="muted">{cv.location}</p>
        </div>
        <ul class="contact">
          {contacts.map((l) => <li><a href={l.href}>{l.label}</a></li>)}
        </ul>
      </header>

      <section class="row">
        <h2>Profile</h2>
        <p class="summary">{cv.summary}</p>
      </section>

      <section class="row">
        <h2>Experience</h2>
        <div class="jobs">
          {cv.experience.map((job) => (
            <div class="job">
              <div class="job-head">
                <h3>{job.role}, {job.org}</h3>
                <span class="muted">{fmtPeriodLong(job.start, job.end)}</span>
              </div>
              <ul>{job.bullets.map((b) => <li>{b}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section class="row">
        <h2>Skills</h2>
        <dl class="pairs">
          {cv.skills.map((s) => (
            <>
              <dt>{s.area}</dt>
              <dd>{s.items.join(', ')}</dd>
            </>
          ))}
        </dl>
      </section>

      {cv.education.length > 0 && (
        <section class="row">
          <h2>Education</h2>
          <div>
            {cv.education.map((e) => (
              <div class="job-head"><h3>{e.degree}, {e.school}</h3><span class="muted">{e.period}</span></div>
            ))}
          </div>
        </section>
      )}

      <section class="row">
        <h2>Languages</h2>
        <dl class="pairs">
          {cv.languages.map((l) => (
            <>
              <dt>{l.name}</dt>
              <dd>{l.level}</dd>
            </>
          ))}
        </dl>
      </section>
    </main>
  </body>
</html>

<style is:global>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0; background: #fff; color: #111;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px; line-height: 1.5;
  }
  a { color: inherit; text-decoration: none; }
  h1, h2, h3, p { margin: 0; }
  .muted { color: #555; }
  .cv { max-width: 900px; margin: 0 auto; padding: 48px 24px; }
  .top {
    display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 20px;
    padding-bottom: 20px; border-bottom: 2px solid #111;
  }
  h1 { font-size: 44px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
  .headline { font-size: 18px; font-weight: 600; margin: 10px 0 2px; }
  .contact { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; font-size: 14px; text-align: right; }
  .row { display: grid; grid-template-columns: 9rem minmax(0, 1fr); gap: 8px 28px; padding-block: 18px; border-bottom: 1px solid #ccc; }
  .row h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding-top: 3px; }
  .summary { max-width: 62ch; }
  .jobs { display: grid; gap: 16px; }
  .job-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 16px; align-items: baseline; }
  h3 { font-size: 16px; font-weight: 700; }
  .job ul { margin: 6px 0 0; padding-left: 1.1em; }
  .job li { margin-bottom: 3px; }
  .pairs { display: grid; grid-template-columns: 9rem 1fr; gap: 4px 20px; margin: 0; }
  dt { font-weight: 600; }
  dd { margin: 0; }
  @media (max-width: 640px) {
    .row, .pairs { grid-template-columns: 1fr; }
    .contact { text-align: left; }
  }
  @media print {
    body { font-size: 10.5pt; }
    .cv { padding: 0; max-width: none; }
    h1 { font-size: 30pt; }
    .row { grid-template-columns: 8rem 1fr; break-inside: avoid; }
    .job { break-inside: avoid; }
  }
  @page { margin: 16mm; }
</style>
```

- [ ] **Step 6: Verify**

Run: `npm test && npm run build`
Expected: tests pass; build `Complete!`.

Run: `grep -o 'Jan 2026 — present' dist/cv/index.html && grep -c 'noindex' dist/cv/index.html`
Expected: `Jan 2026 — present` and `1`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Structured experience dates, open source data file, standalone print CV

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Dark shell — tokens, Base layout, fonts, Shiki theme, sitemap

**Files:**
- Modify: `src/styles/global.css` (full rewrite), `src/layouts/Base.astro` (full rewrite), `astro.config.mjs`, `package.json` (via npm)

- [ ] **Step 1: Remove the unused fonts**

Run: `npm uninstall @fontsource-variable/archivo @fontsource-variable/source-serif-4`
Expected: `package.json` dependencies no longer list them.

- [ ] **Step 2: Rewrite `src/styles/global.css`**

```css
/* ---------- Tokens (dark only) ---------- */
:root {
  --bg: #0b0b0a;
  --bg-2: #121210;
  --line: #24231f;
  --ink: #e8e6df;
  --dim: #bdbab0;
  --mute: #8a877c; /* 5.4:1 on --bg */
  --amber: #ffb224;

  --kind-post: #ffb224;
  --kind-note: #8fd18b;
  --kind-oss: #7fb8ff;
  --kind-job: #e98bd8;
  --merged: #b48cff;
  --del: #f07178;

  --mono: 'JetBrains Mono Variable', ui-monospace, 'SFMono-Regular', Menlo, monospace;
  --gutter: clamp(16px, 4vw, 40px);
  --max: 1080px;
  --measure: 72ch;

  color-scheme: dark;
}

/* ---------- Base ---------- */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--mono);
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
img, svg { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
h1, h2, h3, p, ul, ol { margin: 0; }
:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
::selection { background: var(--amber); color: var(--bg); }

.wrap { width: 100%; max-width: var(--max); margin-inline: auto; padding-inline: var(--gutter); }
.skip { position: absolute; left: -999px; }
.skip:focus { left: var(--gutter); top: 8px; background: var(--amber); color: var(--bg); padding: 6px 10px; z-index: 10; }

.mute { color: var(--mute); }
.dim { color: var(--dim); }

/* Kind labels (NOTE, POST, OSS, JOB). The text carries the meaning; colour only reinforces it. */
.kind { font-weight: 700; text-transform: uppercase; }
.kind-post { color: var(--kind-post); }
.kind-note { color: var(--kind-note); }
.kind-oss { color: var(--kind-oss); }
.kind-job { color: var(--kind-job); }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 3: Rewrite `src/layouts/Base.astro`**

```astro
---
// Fonts are self-hosted (no third-party request).
import '@fontsource-variable/jetbrains-mono';
import '../styles/global.css';
import { site } from '../config';
import { contributions } from '../data/oss';

interface Props {
  title?: string;
  description?: string;
  current?: 'home' | 'logs';
}
const { title, description = site.description, current = 'home' } = Astro.props;
const pageTitle = title ? `${title} · ${site.name}` : site.title;
const nav = [
  { href: '/logs/', label: 'logs', key: 'logs' },
  { href: '/#experience', label: 'experience', key: 'experience' },
  ...(contributions.length > 0 ? [{ href: '/#oss', label: 'oss', key: 'oss' }] : []),
  { href: '/#links', label: 'links', key: 'links' },
];
const year = new Date().getFullYear();
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{pageTitle}</title>
    <meta name="description" content={description} />
    <meta name="theme-color" content="#0b0b0a" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate" type="application/rss+xml" title={site.name} href="/rss.xml" />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={description} />
  </head>
  <body>
    <a class="skip" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="wrap bar">
        <a href="/" class="prompt" aria-label={`${site.name}, home`}>{site.name.toLowerCase()}@log:~$</a>
        <nav aria-label="Main">
          {nav.map((n) => (
            <a href={n.href} aria-current={current === n.key ? 'page' : undefined}>{n.label}</a>
          ))}
        </nav>
      </div>
    </header>

    <main id="main">
      <slot />
    </main>

    <footer class="site-footer">
      <div class="wrap foot">
        <span>-- EOF --</span>
        <span>© {year} {site.name.toLowerCase()}</span>
      </div>
    </footer>
  </body>
</html>

<style>
  .site-header { border-bottom: 1px solid var(--line); }
  .bar {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
    gap: 4px 16px; min-height: 56px; padding-block: 8px; font-size: 13px;
  }
  .prompt { font-weight: 600; white-space: nowrap; }
  .prompt:hover { color: var(--amber); }
  nav { display: flex; gap: clamp(12px, 2.5vw, 24px); color: var(--mute); }
  nav a { padding-block: 6px; }
  nav a:hover, nav a[aria-current='page'] { color: var(--amber); }

  .site-footer { margin-top: clamp(64px, 10vw, 120px); border-top: 1px solid var(--line); }
  .foot { display: flex; justify-content: space-between; gap: 16px; padding-block: 22px; font-size: 13px; color: var(--mute); }
</style>
```

- [ ] **Step 4: Shiki theme and sitemap filter in `astro.config.mjs`**

Replace the file with:

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { wikilinks } from './src/lib/wikilinks.mjs';

// Change `site` to your real domain before deploying.
export default defineConfig({
  site: 'https://yuri.dev',
  trailingSlash: 'always',
  // /cv/ only exists to render the PDF, so it stays out of the sitemap.
  integrations: [sitemap({ filter: (page) => !page.includes('/cv/') })],
  markdown: {
    remarkPlugins: [wikilinks],
    shikiConfig: { theme: 'vesper', wrap: false },
  },
});
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run build`
Expected: tests pass; build `Complete!`.

Run: `grep -c '/cv/' dist/sitemap-0.xml; grep -o 'archivo\|source-serif' -r dist | head -1`
Expected: `0` and no output from the second command.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Dark-only shell: tokens, prompt nav, EOF footer, mono font, vesper code theme

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Home page and its components

**Files:**
- Create: `src/components/SectionHead.astro`, `src/components/Tail.astro`, `src/components/LogList.astro`, `src/components/Experience.astro`, `src/components/OssList.astro`, `src/components/Links.astro`
- Modify: `src/pages/index.astro` (full rewrite)

- [ ] **Step 1: `src/components/SectionHead.astro`**

```astro
---
// "01 experience ─────────── meta". The number is optional; the slot is the right-hand meta.
interface Props {
  title: string;
  n?: number;
  id?: string;
}
const { title, n, id } = Astro.props;
---
<div class="sh">
  <h2 id={id}>{n !== undefined && <span class="n">{String(n).padStart(2, '0')}</span>}{title}</h2>
  <span class="ln" aria-hidden="true"></span>
  <span class="meta"><slot /></span>
</div>

<style>
  .sh { display: flex; align-items: center; gap: 14px; padding: clamp(40px, 7vw, 64px) 0 18px; font-size: 13px; color: var(--mute); }
  h2 { font-size: clamp(20px, 3vw, 26px); font-weight: 800; letter-spacing: -0.03em; color: var(--ink); white-space: nowrap; }
  .n { color: var(--amber); font-weight: 500; font-size: 14px; margin-right: 12px; vertical-align: 3px; }
  .ln { flex: 1; min-width: 24px; height: 1px; background: var(--line); }
  .meta { white-space: nowrap; }
  .meta:empty { display: none; }
  .meta :global(a) { color: var(--amber); }
  .meta :global(a:hover) { text-decoration: underline; }
</style>
```

- [ ] **Step 2: `src/components/Tail.astro`**

```astro
---
import type { TimelineItem } from '../lib/logs';
import { fmtDate } from '../lib/logs';

interface Props {
  items: TimelineItem[];
}
const { items } = Astro.props;
---
<div class="tail">
  <div class="h"><span>tail ~/log</span><span>last {items.length}</span></div>
  <ol>
    {items.map((i) => (
      <li>
        <a href={i.href}>
          <time class="mute" datetime={i.date.toISOString()}>{fmtDate(i.date)}</time>
          <span class={`kind kind-${i.kind}`}>{i.kind}</span>
          <span class="label">{i.label}</span>
        </a>
      </li>
    ))}
  </ol>
</div>

<style>
  .tail { min-width: 0; border: 1px solid var(--line); background: #0d0d0c; font-size: 13px; }
  .h { display: flex; justify-content: space-between; padding: 9px 16px; border-bottom: 1px solid var(--line); color: var(--mute); }
  ol { list-style: none; margin: 0; padding: 0; }
  li:nth-child(even) { background: var(--bg-2); }
  a { display: grid; grid-template-columns: 10ch 4ch minmax(0, 1fr); gap: 12px; padding: 9px 16px; }
  .label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  a:hover .label { color: var(--amber); }
  @media (max-width: 420px) { a { gap: 8px; padding-inline: 12px; } }
</style>
```

- [ ] **Step 3: `src/components/LogList.astro`**

```astro
---
import type { Log } from '../lib/logs';
import { fmtDate } from '../lib/logs';

interface Props {
  logs: Log[];
}
const { logs } = Astro.props;
---
{logs.length === 0 ? (
  <p class="empty mute">no entries yet</p>
) : (
  <ul class="logs">
    {logs.map((l) => (
      <li>
        <a href={l.href}>
          <time class="mute" datetime={l.date.toISOString()}>{fmtDate(l.date)}</time>
          <span class={`kind kind-${l.kind}`}>{l.kind}</span>
          <span class="t">{l.title}</span>
          <span class="meta mute">{l.meta}</span>
          <span class="sum mute">{l.summary}</span>
        </a>
      </li>
    ))}
  </ul>
)}

<style>
  .logs { list-style: none; margin: 0; padding: 0; }
  li + li { border-top: 1px solid var(--line); }
  a { display: grid; grid-template-columns: 10ch 4ch minmax(0, 1fr) auto; gap: 4px 16px; align-items: baseline; padding: 16px 0; }
  time, .kind, .meta { font-size: 13px; }
  .t { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; }
  a:hover .t { color: var(--amber); }
  .sum { grid-column: 3 / -1; max-width: var(--measure); }
  .empty { padding: 16px 0; }
  @media (max-width: 640px) {
    a { grid-template-columns: 10ch 1fr auto; }
    .meta { grid-column: 3; grid-row: 1; }
    .t { grid-column: 1 / -1; grid-row: 2; }
    .sum { grid-column: 1 / -1; grid-row: 3; }
  }
</style>
```

- [ ] **Step 4: `src/components/Experience.astro`**

```astro
---
import type { Job } from '../data/cv';
import { fmtPeriod } from '../lib/logs';

interface Props {
  jobs: Job[];
}
const { jobs } = Astro.props;
---
<ol class="jobs">
  {jobs.map((j) => (
    <li>
      <span class="when mute">{fmtPeriod(j.start, j.end)}</span>
      <div>
        <h3>{j.role}<span class="org mute">@ {j.org}</span></h3>
        <ul>{j.bullets.map((b) => <li>{b}</li>)}</ul>
      </div>
    </li>
  ))}
</ol>
<a class="btn" href="/cv.pdf" download>↓ cv.pdf</a>

<style>
  .jobs { list-style: none; margin: 0; padding: 0; }
  .jobs > li { display: grid; grid-template-columns: 22ch minmax(0, 1fr); gap: 6px 24px; padding: 18px 0; }
  .jobs > li + li { border-top: 1px solid var(--line); }
  .when { font-size: 13px; padding-top: 3px; }
  h3 { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
  .org { font-size: 14px; font-weight: 400; letter-spacing: 0; margin-left: 10px; }
  ul { list-style: none; padding: 0; margin-top: 10px; display: grid; gap: 6px; color: var(--dim); max-width: var(--measure); }
  ul li { padding-left: 2ch; text-indent: -2ch; }
  ul li::before { content: '> '; color: var(--amber); }
  .btn { display: inline-block; margin-top: 18px; border: 1px solid var(--amber); color: var(--amber); padding: 8px 16px; font-size: 13px; font-weight: 600; }
  .btn:hover { background: var(--amber); color: var(--bg); }
  @media (max-width: 640px) { .jobs > li { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 5: `src/components/OssList.astro`**

```astro
---
import type { Contribution } from '../data/oss';

interface Props {
  items: Contribution[];
}
const { items } = Astro.props;
---
<ul class="prs">
  {items.map((c) => (
    <li>
      <a href={c.url}>
        <span class={`badge ${c.status}`}>{c.status}</span>
        <span class="t"><span class="repo">{c.repo}</span> #{c.number} · {c.title}</span>
        {(c.additions !== undefined || c.deletions !== undefined) && (
          <span class="diff">
            {c.additions !== undefined && <span class="add">+{c.additions}</span>}
            {c.deletions !== undefined && <span class="del">−{c.deletions}</span>}
          </span>
        )}
        <span class="why mute">{c.impact}</span>
      </a>
    </li>
  ))}
</ul>

<style>
  .prs { list-style: none; margin: 0; padding: 0; }
  li + li { border-top: 1px solid var(--line); }
  a { display: grid; grid-template-columns: 9ch minmax(0, 1fr) auto; gap: 6px 18px; align-items: baseline; padding: 16px 0; }
  .badge { justify-self: start; padding: 2px 6px; border: 1px solid currentColor; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .merged { color: var(--merged); }
  .open { color: var(--kind-note); }
  .t { font-weight: 600; }
  .repo { color: var(--kind-oss); font-weight: 500; }
  a:hover .t { color: var(--amber); }
  .diff { display: inline-flex; gap: 8px; font-size: 12px; white-space: nowrap; }
  .add { color: var(--kind-note); }
  .del { color: var(--del); }
  .why { grid-column: 2 / -1; max-width: var(--measure); }
  @media (max-width: 640px) {
    a { grid-template-columns: auto 1fr; }
    .diff { grid-column: 2; grid-row: 1; justify-self: end; }
    .t { grid-column: 1 / -1; grid-row: 2; }
    .why { grid-column: 1 / -1; grid-row: 3; }
  }
</style>
```

- [ ] **Step 6: `src/components/Links.astro`**

```astro
---
import { site } from '../config';
---
<ul class="links">
  {site.links.map((l) => (
    <li>
      <a href={l.href}><span class="cmd">{l.cmd}</span><span class="to mute">{l.label}</span></a>
    </li>
  ))}
</ul>

<style>
  .links { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 40px; }
  li { border-top: 1px solid var(--line); }
  a { display: grid; grid-template-columns: 18ch minmax(0, 1fr); gap: 12px; padding: 12px 0; }
  .cmd { font-weight: 600; }
  .cmd::before { content: '$ '; color: var(--amber); }
  a:hover .cmd { color: var(--amber); }
  .to { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @media (max-width: 720px) { .links { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 7: Rewrite `src/pages/index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import SectionHead from '../components/SectionHead.astro';
import Tail from '../components/Tail.astro';
import Experience from '../components/Experience.astro';
import OssList from '../components/OssList.astro';
import LogList from '../components/LogList.astro';
import Links from '../components/Links.astro';
import { site } from '../config';
import { cv } from '../data/cv';
import { getLogs, getTimeline, sortedContributions } from '../lib/content';
import { ossSummary, yearsSince } from '../lib/logs';

const logs = await getLogs();
const timeline = (await getTimeline()).slice(0, 6);
const oss = sortedContributions();
const years = Math.max(...cv.experience.map((j) => yearsSince(j.start)));

// Numbers follow what is actually shown: "open source" disappears when the list is empty.
const sections = ['experience', ...(oss.length > 0 ? ['oss'] : []), 'logs', 'links'];
const num = (key: string) => sections.indexOf(key) + 1;
---
<Base current="home">
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="who">
        <p class="tagline mute">// {site.tagline}</p>
        <h1>{site.name.toLowerCase()}<span class="cursor" aria-hidden="true"></span></h1>
        <p class="intro">{site.intro}</p>
        <ul class="status mute">
          {site.available && <li class="available">{site.available}</li>}
          {site.facts.map((f) => <li>{f}</li>)}
        </ul>
      </div>
      <Tail items={timeline} />
    </div>
  </section>

  <div class="wrap">
    <section id="experience" aria-labelledby="h-experience">
      <SectionHead n={num('experience')} title="experience" id="h-experience">{years >= 1 && `~${years} yrs`}</SectionHead>
      <Experience jobs={cv.experience} />
    </section>

    {oss.length > 0 && (
      <section id="oss" aria-labelledby="h-oss">
        <SectionHead n={num('oss')} title="open source" id="h-oss">{ossSummary(oss)}</SectionHead>
        <OssList items={oss} />
      </section>
    )}

    <section id="logs" aria-labelledby="h-logs">
      <SectionHead n={num('logs')} title="logs" id="h-logs">{logs.length} entries · <a href="/rss.xml">rss</a></SectionHead>
      <LogList logs={logs.slice(0, 6)} />
      <a class="more" href="/logs/">→ all logs</a>
    </section>

    <section id="links" aria-labelledby="h-links">
      <SectionHead n={num('links')} title="links" id="h-links" />
      <Links />
    </section>
  </div>
</Base>

<style>
  .hero { border-bottom: 1px solid var(--line); }
  .hero-grid { display: grid; gap: clamp(32px, 5vw, 48px); padding-block: clamp(40px, 8vw, 88px) clamp(40px, 6vw, 64px); }
  @media (min-width: 900px) { .hero-grid { grid-template-columns: 1fr 1.05fr; align-items: end; } }

  .tagline { font-size: 13px; }
  h1 {
    font-size: clamp(4.5rem, 16vw, 9rem); font-weight: 800; line-height: 0.85;
    letter-spacing: -0.07em; margin: 16px 0 0 -0.05em; overflow-wrap: anywhere;
  }
  .cursor {
    display: inline-block; width: 0.48em; height: 0.74em; margin-left: 0.08em; vertical-align: -0.02em;
    background: var(--amber); animation: blink 1.1s steps(1) infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }
  .intro { max-width: 42ch; margin-top: 24px; font-size: clamp(15px, 1.6vw, 17px); color: var(--dim); }
  .status { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 20px; margin-top: 18px; font-size: 13px; }
  .available::before { content: '●'; color: var(--kind-note); margin-right: 8px; }

  section[id] { scroll-margin-top: 16px; }
  .more { display: inline-block; margin-top: 14px; color: var(--amber); font-weight: 600; }
  .more:hover { text-decoration: underline; }
</style>
```

- [ ] **Step 8: Verify build and content**

Run: `npm test && npm run build`
Expected: tests pass; build `Complete!`.

Run: `grep -o 'tail ~/log\|id="experience"\|id="logs"\|id="links"\|id="oss"' dist/index.html | sort -u`
Expected: `id="experience"`, `id="links"`, `id="logs"`, `tail ~/log` and **no** `id="oss"` (the list is empty).

- [ ] **Step 9: Verify the empty-OSS numbering, then the filled one**

Run: `grep -o '<span class="n"[^>]*>0[0-9]</span>[a-z ]*' dist/index.html`
Expected: `01` experience, `02` logs, `03` links.

Temporarily add one entry to `contributions` in `src/data/oss.ts`:

```ts
  { repo: 'owner/name', number: 1, title: 'test', url: 'https://example.com', status: 'merged', date: '2026-10-24', impact: 'test' },
```

Run: `npm run build && grep -o '<span class="n"[^>]*>0[0-9]</span>[a-z ]*' dist/index.html && grep -c 'href="/#oss"' dist/index.html`
Expected: `01` experience, `02` open source, `03` logs, `04` links; nav count `1`.

Then remove the test entry (restore `src/data/oss.ts` with `git checkout src/data/oss.ts`) and run `npm run build` again.

- [ ] **Step 10: Look at it**

Run `npm run dev`, open `http://localhost:4321/` at 1280px and 390px wide. Compare with `docs/superpowers/specs/2026-11-03-portfolio-redesign-mockup.html`. Check: no horizontal scroll at 390px, cursor blinks, tail rows link correctly, `~3 yrs` shows next to experience.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Home: hero with tail ~/log, experience, open source, logs, links

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `/logs/`, single log pages and the 404

**Files:**
- Create: `src/layouts/LogLayout.astro`, `src/pages/logs/index.astro`, `src/pages/logs/[...slug].astro`
- Modify: `src/pages/404.astro` (full rewrite)

- [ ] **Step 1: `src/layouts/LogLayout.astro`**

```astro
---
import Base from './Base.astro';
import SectionHead from '../components/SectionHead.astro';
import LogList from '../components/LogList.astro';
import type { Log } from '../lib/logs';
import { fmtDate } from '../lib/logs';

interface Props {
  log: Log;
  linkedFrom: Log[];
}
const { log, linkedFrom } = Astro.props;
const tags = log.entry.data.tags ?? [];
const updated = log.kind === 'post' ? log.entry.data.updated : undefined;
---
<Base title={log.title} description={log.summary} current="logs">
  <article class="wrap">
    <header class="head">
      <a class="back" href="/logs/">← cd ../logs</a>
      <p class="meta mute">
        <time datetime={log.date.toISOString()}>{fmtDate(log.date)}</time>
        <span class={`kind kind-${log.kind}`}>{log.kind}</span>
        <span>{log.meta}</span>
        {updated && <span>updated {fmtDate(updated)}</span>}
        {tags.length > 0 && <span>{tags.join(', ')}</span>}
      </p>
      <h1>{log.title}</h1>
      <p class="summary dim">{log.summary}</p>
    </header>

    <div class="prose">
      <slot />
    </div>

    {linkedFrom.length > 0 && (
      <aside class="linked" aria-labelledby="h-linked">
        <SectionHead title="linked from" id="h-linked" />
        <LogList logs={linkedFrom} />
      </aside>
    )}
  </article>
</Base>

<style>
  .head { max-width: 860px; padding-block: clamp(40px, 7vw, 80px) 28px; margin-bottom: 36px; border-bottom: 1px solid var(--line); }
  .back { display: inline-block; margin-bottom: 28px; font-size: 13px; color: var(--mute); }
  .back:hover { color: var(--amber); }
  .meta { display: flex; flex-wrap: wrap; row-gap: 4px; font-size: 13px; }
  .meta > * + *::before { content: '·'; margin-inline: 10px; color: var(--mute); }
  h1 { margin-top: 14px; font-size: clamp(30px, 5.5vw, 56px); font-weight: 800; line-height: 1.02; letter-spacing: -0.05em; }
  .summary { max-width: 60ch; margin-top: 18px; font-size: clamp(15px, 1.8vw, 18px); }

  .prose { max-width: var(--measure); font-size: 16px; line-height: 1.75; }
  .prose :global(:is(p, ul, ol, blockquote, pre, table)) { margin: 0 0 1.3em; }
  .prose :global(:is(h2, h3)) { margin: 2em 0 0.7em; font-weight: 800; line-height: 1.25; letter-spacing: -0.02em; }
  .prose :global(h2) { font-size: 21px; }
  .prose :global(h3) { font-size: 17px; }
  .prose :global(h2::before) { content: '## '; color: var(--mute); font-weight: 500; }
  .prose :global(h3::before) { content: '### '; color: var(--mute); font-weight: 500; }
  .prose :global(a) { color: var(--amber); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 0.2em; }
  .prose :global(a:hover) { text-decoration-thickness: 2px; }
  .prose :global(a.wikilink) { text-decoration-style: dotted; }
  .prose :global(strong) { font-weight: 700; }
  .prose :global(ul) { list-style: none; padding-left: 2ch; }
  .prose :global(ul > li::before) { content: '- '; margin-left: -2ch; color: var(--amber); }
  .prose :global(ol) { padding-left: 3ch; }
  .prose :global(li) { margin-bottom: 0.4em; }
  .prose :global(blockquote) { margin-left: 0; padding-left: 18px; border-left: 2px solid var(--amber); color: var(--dim); }
  .prose :global(code) { font-family: inherit; font-size: 0.92em; padding: 0.1em 0.35em; background: var(--bg-2); border: 1px solid var(--line); }
  .prose :global(pre) { padding: 18px 20px; overflow-x: auto; font-size: 14px; line-height: 1.6; border: 1px solid var(--line); }
  .prose :global(pre code) { padding: 0; font-size: inherit; background: none; border: 0; }
  .prose :global(table) { display: block; width: 100%; overflow-x: auto; border-collapse: collapse; font-size: 14px; }
  .prose :global(:is(th, td)) { padding: 8px 16px 8px 0; text-align: left; white-space: nowrap; border-bottom: 1px solid var(--line); }
  .prose :global(th) { color: var(--mute); font-weight: 600; }
  .prose :global(td) { font-variant-numeric: tabular-nums; }
  .prose :global(hr) { margin: 2.5em 0; border: 0; border-top: 1px solid var(--line); }

  .linked { max-width: 860px; }
</style>
```

- [ ] **Step 2: `src/pages/logs/[...slug].astro`**

```astro
---
import { render } from 'astro:content';
import LogLayout from '../../layouts/LogLayout.astro';
import { getLogs } from '../../lib/content';
import { backlinks } from '../../lib/logs';

export async function getStaticPaths() {
  const logs = await getLogs();
  return logs.map((log) => ({
    params: { slug: log.id },
    props: { log, linkedFrom: backlinks(log, logs) },
  }));
}

const { log, linkedFrom } = Astro.props;
const { Content } = await render(log.entry);
---
<LogLayout log={log} linkedFrom={linkedFrom}>
  <Content />
</LogLayout>
```

- [ ] **Step 3: `src/pages/logs/index.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import SectionHead from '../../components/SectionHead.astro';
import LogList from '../../components/LogList.astro';
import { getLogs } from '../../lib/content';

const logs = await getLogs();
---
<Base title="Logs" description="Posts and notes: finished writing and a working notebook." current="logs">
  <div class="wrap">
    <header class="top">
      <p class="mute">$ ls -t ~/logs</p>
      <h1>logs</h1>
      <p class="lede dim">
        Posts are finished pieces, each answering one question from the ground up. Notes are a working notebook:
        short, linked to each other, rewritten as I learn. A seedling is rough, growing is taking shape, evergreen I'd
        defend in a review.
      </p>
    </header>
    <SectionHead title="all entries" id="h-all">{logs.length} entries · <a href="/rss.xml">rss</a></SectionHead>
    <LogList logs={logs} />
  </div>
</Base>

<style>
  .top { padding-top: clamp(40px, 7vw, 80px); font-size: 13px; }
  h1 { margin: 12px 0 0 -0.04em; font-size: clamp(3.5rem, 12vw, 7rem); font-weight: 800; line-height: 0.9; letter-spacing: -0.07em; }
  .lede { max-width: 62ch; margin-top: 22px; font-size: 15px; }
</style>
```

- [ ] **Step 4: Rewrite `src/pages/404.astro`**

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Not found">
  <section class="wrap nf">
    <h1>404</h1>
    <p class="err">bash: cd: <span class="path">this page</span>: No such file or directory</p>
    <ul class="next">
      <li><a href="/">$ cd ~</a></li>
      <li><a href="/logs/">$ ls /logs</a></li>
    </ul>
  </section>
  <script is:inline>
    document.querySelector('.nf .path').textContent = location.pathname;
  </script>
</Base>

<style>
  .nf { padding-top: clamp(48px, 9vw, 120px); }
  h1 { font-size: clamp(5rem, 22vw, 12rem); font-weight: 800; line-height: 0.85; letter-spacing: -0.07em; color: var(--amber); }
  .err { margin-top: 24px; color: var(--dim); overflow-wrap: anywhere; }
  .next { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 28px; margin-top: 24px; }
  .next a { color: var(--amber); font-weight: 600; }
  .next a:hover { text-decoration: underline; }
</style>
```

- [ ] **Step 5: Verify build, routes and backlinks**

Run: `npm test && npm run build`
Expected: tests pass; build `Complete!`.

Run: `ls dist/logs && grep -o 'href="/logs/cache-lines/"' dist/logs/false-sharing/index.html | head -1 && grep -c 'linked from' dist/logs/cache-lines/index.html`
Expected: one folder per post and note plus `index.html`; the href is found; count `1` or more.

- [ ] **Step 6: Verify the slug-collision error**

Run:
```bash
printf -- '---\ntitle: Dup\ndescription: dup\ndate: 2026-11-01\n---\nx\n' > src/content/posts/mvcc.md
npm run build 2>&1 | grep -o 'Log slug "mvcc" exists in both posts and notes. Rename one of them.'
rm src/content/posts/mvcc.md
```
Expected: the message is printed once. The `rm` must run even though the build failed.

- [ ] **Step 7: Look at it**

With `npm run dev`, check at 1280px and 390px: `/logs/`, `/logs/latency-on-a-human-scale/` (table scrolls sideways inside itself on mobile, code blocks use the dark vesper theme), `/logs/cache-lines/` (shows "linked from"), `/does-not-exist/` (404 shows the path). No horizontal page scroll.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add /logs/ index, single log pages with backlinks, terminal-style 404

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: README and final verification

**Files:**
- Modify: `README.md` (full rewrite)

- [ ] **Step 1: Rewrite `README.md`**

````markdown
# Portfolio

Site pessoal em [Astro](https://astro.build), tema escuro, tudo em monoespaçado: logs (posts e notas), experiência, contribuições open source e links. Site estático, sem framework de JS no cliente, fonte servida pelo próprio site.

## Rodar

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # testes das funções puras (node --test)
npm run build    # gera dist/
```

## Onde fica cada coisa

| O quê | Onde |
| --- | --- |
| Nome, tagline, apresentação, status, links | `src/config.ts` |
| Experiência (home, `/cv/` e PDF) | `src/data/cv.ts` |
| Contribuições open source | `src/data/oss.ts` |
| Posts | `src/content/posts/*.md` |
| Notas | `src/content/notes/*.md` |
| Cores e fonte | `src/styles/global.css` (tokens no topo) |

Procure por `TODO` para achar o que precisa preencher.

## Logs

Posts e notas aparecem juntos no feed (`/logs/`) e cada um vira `/logs/<nome-do-arquivo>/`. Por isso **um post e uma nota não podem ter o mesmo nome de arquivo**: o build para com uma mensagem dizendo qual.

```yaml
# post (src/content/posts)
title: Título
description: Uma frase que aparece na lista.
date: 2026-11-02
tags: [databases]
draft: true        # opcional: só aparece no `npm run dev`

# nota (src/content/notes)
title: MVCC
summary: Uma frase.
status: seedling   # seedling | growing | evergreen
updated: 2026-11-02
```

## Open source

Cada contribuição é um item em `src/data/oss.ts`: repositório, número do PR, título, link, status (`merged` ou `open`), data (`YYYY-MM-DD`) e uma frase de impacto. `additions`/`deletions` são opcionais. Com a lista vazia, a seção e o link `oss` do menu somem.

## Experiência

Em `src/data/cv.ts`, cada emprego tem `start` e, se já acabou, `end`, no formato `YYYY-MM`. A data de início também aparece no `tail ~/log` do topo da home.

## Escrever no Obsidian

Posts e notas aceitam `[[nome]]` e `[[nome|texto]]`, igual ao Obsidian. O link vira `/logs/nome/` e cada página mostra no rodapé quem aponta para ela ("linked from"). Se o alvo ainda não existe, o texto aparece sem link.

Para escrever direto do seu vault, você pode:

- abrir `src/content` como um vault separado no Obsidian, ou
- criar um link simbólico de uma pasta do seu vault para `src/content/notes`:
  `ln -s ~/Obsidian/03-Recursos/Publicar src/content/notes`

Só vai para o site o que estiver nessas pastas.

## PDF do currículo

A página `/cv/` existe só para gerar o PDF: não aparece no menu nem no sitemap.

```bash
npm run build
pip install playwright && playwright install chromium
python scripts/cv_pdf.py   # gera public/cv.pdf a partir de /cv/
npm run build              # copia o PDF para dist/
```

## Publicar

**GitHub Pages:** suba o repositório, vá em Settings → Pages → Source: GitHub Actions. O workflow em `.github/workflows/deploy.yml` publica a cada push na `main`.

**Cloudflare Pages ou Vercel:** importe o repositório; comando de build `npm run build`, pasta de saída `dist`.

Antes do primeiro deploy, troque `site` em `astro.config.mjs` pelo seu domínio.

## Já incluso

- RSS em `/rss.xml` (posts e notas) e sitemap
- Destaque de código com o tema `vesper`
- 404 no estilo terminal
````

- [ ] **Step 2: Full verification**

Run: `npm test && npm run build`
Expected: all tests pass; build `Complete!`.

Run:
```bash
grep -c '/cv/' dist/sitemap-0.xml
test -f dist/cv/index.html && echo cv-ok
grep -o '<link>[^<]*/logs/[^<]*</link>' dist/rss.xml | wc -l
grep -rl 'data-theme\|prefers-color-scheme' dist --include=*.html --include=*.css | head -3
```
Expected: `0`; `cv-ok`; `6` (2 posts + 4 notes); no files listed.

- [ ] **Step 3: Final visual pass**

With `npm run dev`, at 1280px and 390px: `/`, `/logs/`, one post, one note with backlinks, `/cv/`, `/x/` (404). Tab through the home page: focus ring is amber and visible on every link. With "reduce motion" on in the OS, the cursor is solid, not blinking.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Update README for the log stream redesign

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
