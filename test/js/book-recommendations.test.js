const test = require('node:test');
const assert = require('node:assert/strict');
const { groupBooks } = require('../../assets/themes/bootstrap-3/scripts/book-recommendations.js');

const deepWork = { url: 'https://example.com/deep-work', title: 'Deep Work', author: 'Cal Newport' };
const pragProg = { url: 'https://example.com/prag', title: 'The Pragmatic Programmer', author: 'Hunt & Thomas' };
const clean = { url: 'https://example.com/clean', title: 'Clean Code', author: 'Robert C. Martin' };

function recommendation(book, episode) {
  return Object.assign({}, book, { recommended_by: { title: episode, url: '/podcast/' + episode } });
}

test('groupBooks collects every episode that recommended the same book', () => {
  const books = groupBooks([recommendation(deepWork, 'ep1'), recommendation(deepWork, 'ep2')]);
  assert.deepEqual(books[0].recommenders.map((r) => r.title), ['ep1', 'ep2']);
});

test('groupBooks yields one entry per distinct book', () => {
  const books = groupBooks([recommendation(deepWork, 'ep1'), recommendation(pragProg, 'ep1'), recommendation(deepWork, 'ep2')]);
  assert.equal(books.length, 2);
});

test('groupBooks orders the most recommended book first', () => {
  const books = groupBooks([recommendation(pragProg, 'ep1'), recommendation(deepWork, 'ep1'), recommendation(deepWork, 'ep2')]);
  assert.equal(books[0].title, 'Deep Work');
});

test('groupBooks orders equally recommended books alphabetically by title', () => {
  const books = groupBooks([recommendation(pragProg, 'ep1'), recommendation(clean, 'ep2'), recommendation(deepWork, 'ep3')]);
  assert.deepEqual(books.map((b) => b.title), ['Clean Code', 'Deep Work', 'The Pragmatic Programmer']);
});

test('groupBooks treats the same URL with a differently spelled title as one book', () => {
  const variant = Object.assign({}, deepWork, { title: 'Deep Work: Rules for Focused Success' });
  assert.equal(groupBooks([recommendation(deepWork, 'ep1'), recommendation(variant, 'ep2')]).length, 1);
});

test('groupBooks treats the same title at a different URL as a different book', () => {
  const otherEdition = Object.assign({}, deepWork, { url: 'https://example.com/deep-work-2nd' });
  assert.equal(groupBooks([recommendation(deepWork, 'ep1'), recommendation(otherEdition, 'ep2')]).length, 2);
});

test('groupBooks shows the title from the first recommendation of a book', () => {
  const variant = Object.assign({}, deepWork, { title: 'Deep Work (variant)' });
  assert.equal(groupBooks([recommendation(deepWork, 'ep1'), recommendation(variant, 'ep2')])[0].title, 'Deep Work');
});
