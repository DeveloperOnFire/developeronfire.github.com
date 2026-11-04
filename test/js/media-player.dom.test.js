const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPage } = require('./support/rendered-page.js');

const EPISODE = 'podcast/episode-402-johanna-rothman-learning-and-delivering.html';

function episodePage() {
  const page = loadPage(EPISODE);
  const chapters = [...page.document.querySelectorAll('time.chapter-timestamp')];
  return { ...page, chapters };
}

test('clicking a chapter seeks to its timestamp', () => {
  const { chapters, browser } = episodePage();
  chapters[1].parentElement.click(); // 2:28
  assert.deepEqual(browser.seeks, [148]);
});

test('clicking a chapter starts playback', () => {
  const { chapters, browser } = episodePage();
  chapters[1].parentElement.click();
  assert.equal(browser.plays, 1);
});

test('clicking the timestamp itself seeks too', () => {
  const { chapters, browser } = episodePage();
  chapters[1].click();
  assert.deepEqual(browser.seeks, [148]);
});

test('clicking a chapter does not follow its placeholder link', () => {
  const { window, chapters } = episodePage();
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  chapters[1].parentElement.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
});

test('a chapter whose text is not a timestamp does not seek', () => {
  const { chapters, browser } = episodePage();
  chapters[1].textContent = 'soon';
  chapters[1].parentElement.click();
  assert.deepEqual(browser.seeks, []);
});

test('a chapter whose text is not a timestamp does not start playback', () => {
  const { chapters, browser } = episodePage();
  chapters[1].textContent = 'soon';
  chapters[1].parentElement.click();
  assert.equal(browser.plays, 0);
});
