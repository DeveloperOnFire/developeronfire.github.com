const test = require('node:test');
const assert = require('node:assert/strict');
const { filterPosts } = require('../../assets/themes/bootstrap-3/scripts/search.js');

const posts = [
  { title: 'Episode 001 | John Sonmez: Simple Programmer', url: '/podcast/a' },
  { title: 'Episode 452 | Aimee Knight - Inspired', url: '/podcast/b' },
];

test('filterPosts matches titles regardless of letter case', () => {
  assert.deepEqual(filterPosts(posts, 'aimee').map((p) => p.url), ['/podcast/b']);
});

test('filterPosts returns an empty list when no title contains the query', () => {
  assert.deepEqual(filterPosts(posts, 'zzz'), []);
});

test('filterPosts returns null for a blank query so the caller hides the results', () => {
  assert.equal(filterPosts(posts, '   '), null);
});

test('filterPosts returns null for a missing query', () => {
  assert.equal(filterPosts(posts, undefined), null);
});
