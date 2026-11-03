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
