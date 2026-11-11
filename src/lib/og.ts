// Link preview images (1200×630) for LinkedIn, X, Slack, WhatsApp. Rendered at build time:
// satori lays out the card as SVG, resvg turns it into a PNG. Colors mirror src/styles/global.css.
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const C = { bg: '#0b0b0a', line: '#24231f', ink: '#e8e6df', dim: '#bdbab0', mute: '#8a877c', amber: '#ffb224' };
const W = 1200;
const H = 630;

// satori reads .woff (not .woff2), so the card uses @fontsource/jetbrains-mono instead of the site's variable font.
const font = (weight: 400 | 800) =>
  fs.readFileSync(path.resolve(`node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${weight}-normal.woff`));
let fonts: { name: string; data: Buffer; weight: 400 | 800; style: 'normal' }[] | undefined;

type Style = Record<string, string | number>;
const h = (style: Style, ...children: unknown[]) => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});

async function png(card: unknown): Promise<Uint8Array> {
  fonts ??= [400, 800].map((weight) => ({ name: 'mono', data: font(weight as 400 | 800), weight: weight as 400 | 800, style: 'normal' as const }));
  const svg = await satori(card as Parameters<typeof satori>[0], { width: W, height: H, fonts });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}

// "yuri" + the amber block, as in the hero.
const mark = (size: number) =>
  h({ alignItems: 'flex-end', fontSize: size, fontWeight: 800, letterSpacing: '-0.06em', color: C.ink, lineHeight: 1 },
    'yuri',
    h({ width: size * 0.42, height: size * 0.78, marginLeft: size * 0.08, marginBottom: size * 0.06, background: C.amber }),
  );

const frame = (...children: unknown[]) =>
  h({ width: W, height: H, boxSizing: 'border-box', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px 56px', background: C.bg, color: C.ink, fontFamily: 'mono', borderTop: `8px solid ${C.amber}` },
    ...children);

const footer = (left: unknown, right: string) =>
  h({ alignItems: 'center', justifyContent: 'space-between', paddingTop: 32, borderTop: `1px solid ${C.line}` },
    left,
    h({ fontSize: 26, color: C.mute }, right),
  );

export function logCard(p: { title: string; date: string; kind: string; meta: string }) {
  const size = p.title.length <= 40 ? 76 : p.title.length <= 70 ? 64 : 56;
  return png(
    frame(
      h({ fontSize: 26, color: C.mute, gap: 18 },
        h({}, p.date), h({}, '·'), h({ color: C.amber, fontWeight: 800 }, p.kind.toUpperCase()), h({}, '·'), h({}, p.meta)),
      h({ fontSize: size, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', maxHeight: size * 1.1 * 4, overflow: 'hidden' }, p.title),
      footer(mark(44), 'yuricosta.dev'),
    ),
  );
}

export function siteCard(p: { tagline: string; intro: string }) {
  return png(
    frame(
      h({ fontSize: 26, color: C.mute }, `// ${p.tagline}`),
      h({ flexDirection: 'column', gap: 28 },
        mark(150),
        h({ fontSize: 30, lineHeight: 1.45, color: C.dim, maxWidth: 1000 }, p.intro),
      ),
      footer(h({ fontSize: 26, color: C.mute }, 'yuri@log:~$'), 'yuricosta.dev'),
    ),
  );
}
