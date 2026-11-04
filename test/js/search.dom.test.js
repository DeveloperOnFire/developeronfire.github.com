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

test('ArrowDown does not select the no-results row', async () => {
  const { type, key, list } = searchPage();
  type('zzz');
  await settle();
  key('ArrowDown');
  assert.equal(list.querySelectorAll('.selected').length, 0);
});

test('ArrowUp does not select the no-results row', async () => {
  const { type, key, list } = searchPage();
  type('zzz');
  await settle();
  key('ArrowUp');
  assert.equal(list.querySelectorAll('.selected').length, 0);
});

test('ArrowDown does not select the failure row', async () => {
  const { type, key, list } = searchPage(() => Promise.reject(new Error('offline')));
  type('reem');
  await settle();
  key('ArrowDown');
  assert.equal(list.querySelectorAll('.selected').length, 0);
});

test('Enter on the failure row goes nowhere', async () => {
  const { type, key, window } = searchPage(() => Promise.reject(new Error('offline')));
  type('reem');
  await settle();
  key('ArrowDown');
  key('Enter');
  assert.equal(window.location.hash, '');
});

test('a query with a trailing space still finds the episode', async () => {
  const { type, list } = searchPage();
  type('humans ');
  await settle();
  assert.equal(list.querySelectorAll('a').length, 1);
});

test('clicking outside the search area closes the dropdown', async () => {
  const { document, container } = await allThreeResults();
  document.querySelector('.hero').click();
  assert.equal(container.classList.contains('shown'), false);
});

test('clicking outside the search area keeps the text in the box', async () => {
  const { document, box } = await allThreeResults();
  document.querySelector('.hero').click();
  assert.equal(box.value, 'Episode');
});

test('clicking in the search box keeps the dropdown open', async () => {
  const { box, container } = await allThreeResults();
  box.click();
  assert.equal(container.classList.contains('shown'), true);
});

test('focus moving outside the search area closes the dropdown', async () => {
  const { window, document, box, container } = await allThreeResults();
  box.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: document.querySelector('.hero a') }));
  assert.equal(container.classList.contains('shown'), false);
});

test('focus moving from the box to a result keeps the dropdown open', async () => {
  const { window, box, list, container } = await allThreeResults();
  box.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: list.querySelector('a') }));
  assert.equal(container.classList.contains('shown'), true);
});

// Safari does not focus a link on click, so the box loses focus to nothing part way through
// a click on a result. Closing here would remove the result before the click lands.
test('focus going nowhere keeps the dropdown open so a result can still be clicked', async () => {
  const { window, box, container } = await allThreeResults();
  box.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
  assert.equal(container.classList.contains('shown'), true);
});

test('Escape on a focused result clears the box', async () => {
  const { window, box, list } = await allThreeResults();
  const result = list.querySelector('a');
  result.focus();
  press(window, result, 'Escape');
  assert.equal(box.value, '');
});

test('Escape on a focused result closes the dropdown', async () => {
  const { window, list, container } = await allThreeResults();
  const result = list.querySelector('a');
  result.focus();
  press(window, result, 'Escape');
  assert.equal(container.classList.contains('shown'), false);
});

test('Escape on a focused result returns focus to the box', async () => {
  const { window, document, box, list } = await allThreeResults();
  const result = list.querySelector('a');
  result.focus();
  press(window, result, 'Escape');
  assert.equal(document.activeElement, box);
});

test('Escape on a focused result leaves the mobile menu open', async () => {
  const { window, document, list, type } = searchPage();
  await settle();
  const menu = document.getElementById('site-menu');
  document.querySelector('.menu-toggle').click();
  type('Episode');
  await settle();
  const result = list.querySelector('a');
  result.focus();
  press(window, result, 'Escape');
  assert.equal(menu.classList.contains('open'), true);
});

test('the search script marks the page once search can work', () => {
  const { document } = searchPage();
  assert.equal(document.documentElement.classList.contains('search-ready'), true);
});

test('search stays hidden if its setup fails part way through', () => {
  const { document } = loadPage('index.html', {
    beforeScripts(window) {
      window.document.addEventListener = () => { throw new Error('setup failed'); };
    },
  });
  assert.equal(document.documentElement.classList.contains('search-ready'), false);
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

test('results for an earlier query never reach the dropdown', async () => {
  let deliver;
  const page = searchPage(() => new Promise((resolve) => { deliver = resolve; }));
  const rendered = [];
  new page.window.MutationObserver((changes) => {
    changes.forEach((change) => change.addedNodes.forEach((row) => rendered.push(row.textContent)));
  }).observe(page.list, { childList: true });
  page.type('Episode');
  page.type('reem');
  deliver(jsonResponse(episodes));
  await settle();
  assert.deepEqual(rendered, ['Episode 450 | Reem Altamimi - Leading Humans']);
});

test('results arriving after a click away do not open the dropdown', async () => {
  let deliver;
  const page = searchPage(() => new Promise((resolve) => { deliver = resolve; }));
  page.type('Episode');
  page.document.querySelector('.hero').click();
  deliver(jsonResponse(episodes));
  await settle();
  assert.equal(page.container.classList.contains('shown'), false);
});

test('results arriving after focus moved away do not open the dropdown', async () => {
  let deliver;
  const page = searchPage(() => new Promise((resolve) => { deliver = resolve; }));
  page.type('Episode');
  page.box.dispatchEvent(new page.window.FocusEvent('focusout', { bubbles: true, relatedTarget: page.document.querySelector('.hero a') }));
  deliver(jsonResponse(episodes));
  await settle();
  assert.equal(page.container.classList.contains('shown'), false);
});

test('a load failing after a click away does not open the dropdown', async () => {
  let fail;
  const page = searchPage(() => new Promise((resolve, reject) => { fail = reject; }));
  page.type('Episode');
  page.document.querySelector('.hero').click();
  fail(new Error('offline'));
  await settle();
  assert.equal(page.container.classList.contains('shown'), false);
});

test('coming back to a dismissed search reopens the dropdown', async () => {
  const { document, box, container } = await allThreeResults();
  document.querySelector('.hero').click();
  box.focus();
  await settle();
  assert.equal(container.classList.contains('shown'), true);
});

test('coming back to a dismissed search lists its results again', async () => {
  const { document, box, list } = await allThreeResults();
  document.querySelector('.hero').click();
  box.focus();
  await settle();
  assert.equal(list.children.length, 3);
});

test('coming back to a search still open keeps the keyboard selection', async () => {
  const { key, box, selectedIndex, list } = await allThreeResults();
  key('ArrowDown');
  list.querySelector('a').focus();
  box.focus();
  await settle();
  assert.equal(selectedIndex(), 1);
});

test('focusing the empty box does not load the episode index', async () => {
  const { box, browser } = searchPage();
  box.focus();
  await settle();
  assert.equal(browser.fetchCalls.length, 0);
});

// Below the desktop width the dropdown pushes the page down, so closing it during a press
// moves the page under the pointer and the click lands on something else.
test('pressing a link outside the search area leaves the dropdown open for the click', async () => {
  const { window, document, box, container } = await allThreeResults();
  const link = document.querySelector('.hero a');
  link.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
  box.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: link }));
  assert.equal(container.classList.contains('shown'), true);
});

test('the click that follows a press outside closes the dropdown', async () => {
  const { window, document, box, container } = await allThreeResults();
  const link = document.querySelector('.hero a');
  link.addEventListener('click', (event) => event.preventDefault());
  link.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
  box.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: link }));
  link.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  link.click();
  assert.equal(container.classList.contains('shown'), false);
});

test('focus moving outside after a finished press still closes the dropdown', async () => {
  const { window, document, box, container } = await allThreeResults();
  const hero = document.querySelector('.hero');
  box.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
  box.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  box.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: hero.querySelector('a') }));
  assert.equal(container.classList.contains('shown'), false);
});

test('the episode index is fetched once however much is typed', async () => {
  const { type, browser } = searchPage();
  type('a');
  await settle();
  type('al');
  await settle();
  assert.deepEqual(browser.fetchCalls, ['/search.json']);
});

test('a failed index load says search is unavailable, not that nothing matched', async () => {
  const { type, list } = searchPage(() => Promise.reject(new Error('offline')));
  type('reem');
  await settle();
  assert.equal(list.textContent.trim(), 'Search is unavailable right now.');
});

test('an error response says search is unavailable, not that nothing matched', async () => {
  const { type, list } = searchPage(() => Promise.resolve(errorResponse(episodes)));
  type('reem');
  await settle();
  assert.equal(list.textContent.trim(), 'Search is unavailable right now.');
});

test('a failed load arriving after the box was emptied opens nothing', async () => {
  let fail;
  const page = searchPage(() => new Promise((resolve, reject) => { fail = reject; }));
  page.type('reem');
  page.type('');
  fail(new Error('offline'));
  await settle();
  assert.equal(page.container.classList.contains('shown'), false);
});

test('a failed index load opens the dropdown rather than failing silently', async () => {
  const { type, container } = searchPage(() => Promise.reject(new Error('offline')));
  type('reem');
  await settle();
  assert.equal(container.classList.contains('shown'), true);
});

test('spaces alone do not load the episode index', async () => {
  const { type, browser } = searchPage();
  type('   ');
  await settle();
  assert.equal(browser.fetchCalls.length, 0);
});

test('spaces alone show no failure when the index cannot load', async () => {
  const { type, container } = searchPage(() => Promise.reject(new Error('offline')));
  type('   ');
  await settle();
  assert.equal(container.classList.contains('shown'), false);
});

test('a failed index load is logged where monitoring can see it', async () => {
  const page = searchPage(() => Promise.reject(new Error('offline')));
  const logged = [];
  page.window.console.error = (error) => logged.push(error.message);
  page.type('reem');
  await settle();
  assert.deepEqual(logged, ['offline']);
});

test('an index that is not a list says search is unavailable', async () => {
  const { type, list } = searchPage(() => Promise.resolve(jsonResponse({})));
  type('reem');
  await settle();
  assert.equal(list.textContent, 'Search is unavailable right now.');
});

test('an index that is not a list is fetched again on the next keystroke', async () => {
  const { type, browser } = searchPage(() => Promise.resolve(jsonResponse({})));
  type('r');
  await settle();
  type('re');
  await settle();
  assert.equal(browser.fetchCalls.length, 2);
});

test('a fault while showing results is not passed off as an outage', async () => {
  const { type, list } = searchPage(() => Promise.resolve(jsonResponse([{ url: '#untitled' }])));
  type('reem');
  await settle();
  assert.equal(list.children.length, 0);
});

test('a fault while showing results is logged where monitoring can see it', async () => {
  const page = searchPage(() => Promise.resolve(jsonResponse([{ url: '#untitled' }])));
  const logged = [];
  page.window.console.error = (error) => logged.push(error.name);
  page.type('reem');
  await settle();
  assert.deepEqual(logged, ['TypeError']);
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
