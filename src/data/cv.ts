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
