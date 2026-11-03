// Single source for the /cv/ page and the PDF (scripts/cv_pdf.py).
// Replace every TODO with your own facts. Bullets read best as: what you did, at what scale, with what result.

export const cv = {
  headline: 'Software engineer · Backend, Go',
  location: 'São Paulo, Brazil · open to relocation',
  summary:
    'Backend engineer with about three years of professional experience, building production services in Go. Going deep on low-level systems and distributed systems: memory, concurrency, databases and networks.',

  experience: [
    {
      role: 'Software Engineer',
      org: 'Mercado Livre',
      period: '2026 — present',
      bullets: [
        'Backend services in Go running in production at high scale.',
        'TODO: what you own, the scale it runs at, and one result you can point to.',
        'TODO: a design decision you wrote and drove (an ADR, a migration, a reliability fix).',
      ],
    },
    {
      role: 'TODO: previous role',
      org: 'TODO: company',
      period: 'TODO',
      bullets: ['TODO: one or two bullets.'],
    },
  ],

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
