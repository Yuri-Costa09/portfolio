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
