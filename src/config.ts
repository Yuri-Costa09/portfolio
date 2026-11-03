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
