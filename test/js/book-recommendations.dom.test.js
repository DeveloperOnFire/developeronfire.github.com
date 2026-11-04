const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPage, jsonResponse, errorResponse, settle } = require('./support/rendered-page.js');

function recommendation(url, title, author, episode) {
  return { url, title, author, recommended_by: { title: `Episode ${episode}`, url: `/podcast/${episode}` } };
}

const recommendations = [
  recommendation('https://example.com/prag', 'The Pragmatic Programmer', 'Hunt', 1),
  recommendation('https://example.com/deep', 'Deep Work', 'Newport', 2),
  recommendation('https://example.com/deep', 'Deep Work', 'Newport', 3),
];

async function bookPage(fetch = () => Promise.resolve(jsonResponse(recommendations))) {
  const page = loadPage('book-recommendations.html', { fetch });
  await settle();
  return { ...page, list: page.document.getElementById('book-recommendations') };
}

test('the list has one entry per book', async () => {
  const { list } = await bookPage();
  assert.equal(list.children.length, 2);
});

test('the most recommended book comes first', async () => {
  const { list } = await bookPage();
  assert.equal(list.querySelector('a').textContent, 'Deep Work - Newport');
});

test('a book links to its page', async () => {
  const { list } = await bookPage();
  assert.equal(list.querySelector('a').getAttribute('href'), 'https://example.com/deep');
});

test('a book lists every episode that recommended it', async () => {
  const { list } = await bookPage();
  assert.equal(list.children[0].querySelectorAll('ul li').length, 2);
});

test('a recommending episode is named', async () => {
  const { list } = await bookPage();
  assert.equal(list.querySelector('li ul a').textContent, 'Episode 2');
});

test('a recommending episode links to its page', async () => {
  const { list } = await bookPage();
  assert.equal(list.querySelector('li ul a').getAttribute('href'), '/podcast/2');
});

test('a book title containing markup is shown as text', async () => {
  const titled = [recommendation('https://example.com/x', '<b>Bold</b>', 'Author', 1)];
  const { list } = await bookPage(() => Promise.resolve(jsonResponse(titled)));
  assert.equal(list.querySelector('a').children.length, 0);
});

test('an episode title containing markup is shown as text', async () => {
  const titled = [Object.assign(recommendation('https://example.com/x', 'Title', 'Author', 1), { recommended_by: { title: '<b>Bold</b>', url: '/podcast/1' } })];
  const { list } = await bookPage(() => Promise.resolve(jsonResponse(titled)));
  assert.equal(list.querySelector('li ul a').children.length, 0);
});

test('the book list is fetched from the recommendations endpoint', async () => {
  const { browser } = await bookPage();
  assert.deepEqual(browser.fetchCalls, ['/book-recommendations.json']);
});

test('a failed load tells the visitor', async () => {
  const { list } = await bookPage(() => Promise.reject(new Error('offline')));
  assert.equal(list.textContent.trim(), 'The book list could not be loaded right now.');
});

test('an error response tells the visitor', async () => {
  const { list } = await bookPage(() => Promise.resolve(errorResponse(recommendations)));
  assert.equal(list.textContent.trim(), 'The book list could not be loaded right now.');
});
