// Everything personal lives here, in src/data/experience.ts and in src/data/oss.ts.
export const site = {
  name: 'Yuri',
  title: 'Yuri Costa — software engineer',
  description:
    'Software engineer building event-driven Go and Java payment services at Mercado Pago. Writing to understand how programs actually run.',
  // The "// ..." line above the name.
  tagline: 'software engineer · distributed systems · payments',
  intro:
    'Event-driven Go and Java microservices for payment processing at Mercado Pago, 20M+ transactions a day. I write to understand how programs actually run, from the cache line to the network.',
  // Optional status with a green dot, e.g. 'open to work'. Leave undefined to hide it.
  available: undefined as string | undefined,
  facts: ['São Paulo / Santos, BR'],
  // Shown as `$ cmd   label` in the links section. Add or remove freely.
  links: [
    { cmd: 'open github', label: 'github.com/Yuri-Costa09', href: 'https://github.com/Yuri-Costa09' },
    { cmd: 'open linkedin', label: 'linkedin.com/in/yuri-rod-costa', href: 'https://www.linkedin.com/in/yuri-rod-costa' },
    { cmd: 'mail', label: 'yurircostawork@gmail.com', href: 'mailto:yurircostawork@gmail.com' },
    { cmd: 'curl rss.xml', label: 'feed', href: '/rss.xml' },
  ],
};
