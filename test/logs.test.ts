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
