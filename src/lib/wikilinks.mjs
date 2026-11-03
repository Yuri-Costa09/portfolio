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
