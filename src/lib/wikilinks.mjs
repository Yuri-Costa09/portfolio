// Turns Obsidian-style [[note-name]] and [[note-name|label]] into links to /notes/<slug>/.
// Lets you write notes in Obsidian and publish them unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

const WIKILINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Use the note's title as link text when no |label is given.
function noteTitles() {
  const dir = path.resolve('src/content/notes');
  const titles = new Map();
  if (!fs.existsSync(dir)) return titles;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const m = fs.readFileSync(path.join(dir, file), 'utf8').match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (m) titles.set(slugify(file.replace(/\.md$/, '')), m[1]);
  }
  return titles;
}

// "Cache lines" reads as "cache lines" mid-sentence; acronyms like "MVCC" stay as they are.
const inline = (t) => (t && !/^[A-Z]{2}/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);

export function wikilinks() {
  const titles = noteTitles();
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === undefined || !WIKILINK.test(node.value)) return;
      WIKILINK.lastIndex = 0;

      const parts = [];
      let last = 0;
      for (const m of node.value.matchAll(WIKILINK)) {
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) });
        const slug = slugify(m[1]);
        const text = m[2] ?? inline(titles.get(slug)) ?? m[1];
        parts.push({
          type: 'link',
          url: `/notes/${slug}/`,
          data: { hProperties: { className: ['wikilink'] } },
          children: [{ type: 'text', value: text.trim() }],
        });
        last = m.index + m[0].length;
      }
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) });

      parent.children.splice(index, 1, ...parts);
      return index + parts.length;
    });
  };
}
