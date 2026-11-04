const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPage, jsonResponse, errorResponse, settle, press } = require('./support/rendered-page.js');

const episodes = [
  { title: 'Episode 452 | Aimee Knight - Inspired', url: '#aimee', image: '/a.jpg' },
  { title: 'Episode 451 | Alberto Brandolini - Mistakes', url: '#alberto', image: '/b.jpg' },
  { title: 'Episode 450 | Reem Altamimi - Leading Humans', url: '#reem', image: '/c.jpg' },
];

function searchPage(fetch = () => Promise.resolve(jsonResponse(episodes))) {
  const page = loadPage('index.html', { fetch });
  const box = page.document.getElementById('search');
  const container = page.document.querySelector('.search-result-container');
  const list = page.document.querySelector('.search-result');
  return {
    ...page,
    box,
    container,
    list,
    type(text) {
      box.value = text;
      box.dispatchEvent(new page.window.Event('input', { bubbles: true }));
    },
    key(name) { press(page.window, box, name); },
    selectedIndex() {
      return [...list.children].findIndex((item) => item.classList.contains('selected'));
    },
  };
}

async function allThreeResults() {
  const page = searchPage();
  page.type('Episode');
  await settle();
  return page;
}

test('typing lists one result per matching episode', async () => {
  const { type, list } = searchPage();
  type('Episode 45');
  await settle();
  assert.equal(list.children.length, 3);
});

test('typing leaves out episodes that do not match', async () => {
  const { type, list } = searchPage();
  type('reem');
  await settle();
  assert.equal(list.children.length, 1);
});

test('a result links to its episode', async () => {
  const { type, list } = searchPage();
  type('reem');
  await settle();
  assert.equal(list.querySelector('a').getAttribute('href'), '#reem');
});

test('a result shows the episode title', async () => {
  const { type, list } = searchPage();
  type('reem');
  await settle();
  assert.equal(list.querySelector('span').textContent, episodes[2].title);
});

test('a result shows the episode image', async () => {
  const { type, list } = searchPage();
  type('reem');
  await settle();
  assert.equal(list.querySelector('img').getAttribute('src'), '/c.jpg');
});

test('a result image loads lazily', async () => {
  const { type, list } = searchPage();
  type('reem');
  await settle();
  assert.equal(list.querySelector('img').loading, 'lazy');
});

test('a title containing markup is shown as text', async () => {
  const titled = [{ title: 'Episode 1 | <b>Bold</b>', url: '#bold', image: '/a.jpg' }];
  const { type, list } = searchPage(() => Promise.resolve(jsonResponse(titled)));
  type('Episode');
  await settle();
  assert.equal(list.querySelector('span').children.length, 0);
});

test('the dropdown is shown while there are results', async () => {
  const { container } = await allThreeResults();
  assert.equal(container.classList.contains('shown'), true);
});

test('the first result starts selected', async () => {
  const { selectedIndex } = await allThreeResults();
  assert.equal(selectedIndex(), 0);
});

test('a search with no matches says so', async () => {
  const { type, list } = searchPage();
  type('zzz');
  await settle();
  assert.equal(list.textContent.trim(), 'No results found');
});

test('a search with no matches shows the dropdown', async () => {
  const { type, container } = searchPage();
  type('zzz');
  await settle();
  assert.equal(container.classList.contains('shown'), true);
});

test('emptying the box hides the dropdown', async () => {
  const { type, container } = await allThreeResults();
  type('');
  assert.equal(container.classList.contains('shown'), false);
});

test('emptying the box removes the results', async () => {
  const { type, list } = await allThreeResults();
  type('');
  assert.equal(list.children.length, 0);
});

test('a box of only spaces hides the dropdown', async () => {
  const { type, container } = await allThreeResults();
  type('   ');
  await settle();
  assert.equal(container.classList.contains('shown'), false);
});

test('ArrowDown selects the next result', async () => {
  const { key, selectedIndex } = await allThreeResults();
  key('ArrowDown');
  assert.equal(selectedIndex(), 1);
});

test('ArrowUp selects the previous result', async () => {
  const { key, selectedIndex } = await allThreeResults();
  key('ArrowDown');
  key('ArrowUp');
  assert.equal(selectedIndex(), 0);
});

test('ArrowDown wraps from the last result to the first', async () => {
  const { key, selectedIndex } = await allThreeResults();
  key('ArrowDown');
  key('ArrowDown');
  key('ArrowDown');
  assert.equal(selectedIndex(), 0);
});

test('ArrowUp wraps from the first result to the last', async () => {
  const { key, selectedIndex } = await allThreeResults();
  key('ArrowUp');
  assert.equal(selectedIndex(), 2);
});

test('moving the selection leaves exactly one result selected', async () => {
  const { key, list } = await allThreeResults();
  key('ArrowDown');
  assert.equal(list.querySelectorAll('.selected').length, 1);
});

test('moving the selection keeps it in view', async () => {
  const { key, list, browser } = await allThreeResults();
  key('ArrowDown');
  assert.deepEqual(browser.scrolledIntoView, [list.children[1]]);
});

test('Enter goes to the first result', async () => {
  const { key, window } = await allThreeResults();
  key('Enter');
  assert.equal(window.location.hash, '#aimee');
});

test('Enter goes to the result the keyboard selected', async () => {
  const { key, window } = await allThreeResults();
  key('ArrowDown');
  key('Enter');
  assert.equal(window.location.hash, '#alberto');
});

test('Enter with no matches goes nowhere', async () => {
  const { type, key, window } = searchPage();
  type('zzz');
  await settle();
  key('Enter');
  assert.equal(window.location.hash, '');
});

test('Escape clears the box', async () => {
  const { key, box } = await allThreeResults();
  key('Escape');
  assert.equal(box.value, '');
});

test('Escape hides the dropdown', async () => {
  const { key, container } = await allThreeResults();
  key('Escape');
  assert.equal(container.classList.contains('shown'), false);
});

test('Escape removes the results', async () => {
  const { key, list } = await allThreeResults();
  key('Escape');
  assert.equal(list.children.length, 0);
});

test('results arriving after the box was emptied are not shown', async () => {
  let deliver;
  const page = searchPage(() => new Promise((resolve) => { deliver = resolve; }));
  page.type('Episode');
  page.type('');
  deliver(jsonResponse(episodes));
  await settle();
  assert.equal(page.list.children.length, 0);
});

test('results for an earlier query give way to the text now in the box', async () => {
  let deliver;
  const page = searchPage(() => new Promise((resolve) => { deliver = resolve; }));
  page.type('Episode');
  page.type('reem');
  deliver(jsonResponse(episodes));
  await settle();
  assert.equal(page.list.children.length, 1);
});

test('the episode index is fetched once however much is typed', async () => {
  const { type, browser } = searchPage();
  type('a');
  await settle();
  type('al');
  await settle();
  assert.deepEqual(browser.fetchCalls, ['/search.json']);
});

test('a failed index load opens the dropdown rather than failing silently', async () => {
  const { type, container } = searchPage(() => Promise.reject(new Error('offline')));
  type('reem');
  await settle();
  assert.equal(container.classList.contains('shown'), true);
});

test('a failed index load puts a message in the dropdown', async () => {
  const { type, list } = searchPage(() => Promise.reject(new Error('offline')));
  type('reem');
  await settle();
  assert.equal(list.children.length, 1);
});

// An error page can still parse as JSON, so the status has to be what rejects it.
test('an error response is not shown as results', async () => {
  const { type, list } = searchPage(() => Promise.resolve(errorResponse(episodes)));
  type('Episode');
  await settle();
  assert.equal(list.children.length, 1);
});

test('an error response is not kept as the index', async () => {
  const { type, browser } = searchPage(() => Promise.resolve(errorResponse(episodes)));
  type('r');
  await settle();
  type('re');
  await settle();
  assert.equal(browser.fetchCalls.length, 2);
});

test('the next keystroke retries a failed index load', async () => {
  const { type, browser } = searchPage(() => Promise.reject(new Error('offline')));
  type('r');
  await settle();
  type('re');
  await settle();
  assert.equal(browser.fetchCalls.length, 2);
});
