const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPage, settle, press } = require('./support/rendered-page.js');

// The menu is wired on DOMContentLoaded, which jsdom fires after loadPage returns.
async function homepage() {
  const page = loadPage('index.html');
  await settle();
  return {
    ...page,
    button: page.document.querySelector('.menu-toggle'),
    menu: page.document.getElementById('site-menu'),
    firstLink: page.document.querySelector('.site-nav a'),
    search: page.document.getElementById('search'),
  };
}

test('the page is marked as scripted once the menu script has run', async () => {
  assert.equal((await homepage()).document.documentElement.classList.contains('js'), true);
});

test('the menu starts closed', async () => {
  assert.equal((await homepage()).menu.classList.contains('open'), false);
});

test('clicking the menu button opens the menu', async () => {
  const { button, menu } = await homepage();
  button.click();
  assert.equal(menu.classList.contains('open'), true);
});

test('clicking the menu button marks it expanded', async () => {
  const { button } = await homepage();
  button.click();
  assert.equal(button.getAttribute('aria-expanded'), 'true');
});

test('clicking the menu button again closes the menu', async () => {
  const { button, menu } = await homepage();
  button.click();
  button.click();
  assert.equal(menu.classList.contains('open'), false);
});

test('clicking the menu button again marks it collapsed', async () => {
  const { button } = await homepage();
  button.click();
  button.click();
  assert.equal(button.getAttribute('aria-expanded'), 'false');
});

test('Escape closes the open menu', async () => {
  const { window, button, menu, firstLink } = await homepage();
  button.click();
  firstLink.focus();
  press(window, firstLink, 'Escape');
  assert.equal(menu.classList.contains('open'), false);
});

test('Escape marks the menu button collapsed', async () => {
  const { window, button, firstLink } = await homepage();
  button.click();
  firstLink.focus();
  press(window, firstLink, 'Escape');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
});

test('Escape returns focus to the menu button', async () => {
  const { window, document, button, firstLink } = await homepage();
  button.click();
  firstLink.focus();
  press(window, firstLink, 'Escape');
  assert.equal(document.activeElement, button);
});

test('Escape while the menu is closed leaves focus where it is', async () => {
  const { window, document, firstLink } = await homepage();
  firstLink.focus();
  press(window, firstLink, 'Escape');
  assert.equal(document.activeElement, firstLink);
});

test('Escape in the search box leaves the menu open', async () => {
  const { window, button, menu, search } = await homepage();
  button.click();
  search.focus();
  press(window, search, 'Escape');
  assert.equal(menu.classList.contains('open'), true);
});

test('crossing up to the desktop width closes the open menu', async () => {
  const { button, menu, browser } = await homepage();
  button.click();
  browser.crossBreakpoint(true);
  assert.equal(menu.classList.contains('open'), false);
});

test('crossing up to the desktop width marks the menu button collapsed', async () => {
  const { button, browser } = await homepage();
  button.click();
  browser.crossBreakpoint(true);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
});

test('crossing up to the desktop width moves focus off the button it hides', async () => {
  const { document, button, firstLink, browser } = await homepage();
  button.focus();
  button.click();
  browser.crossBreakpoint(true);
  assert.equal(document.activeElement, firstLink);
});

test('crossing up to the desktop width recovers focus the browser already dropped from the button', async () => {
  const { document, button, firstLink, browser } = await homepage();
  button.focus();
  button.click();
  button.blur();
  browser.crossBreakpoint(true);
  assert.equal(document.activeElement, firstLink);
});

test('crossing up to the desktop width leaves focus elsewhere alone', async () => {
  const { document, button, search, browser } = await homepage();
  button.click();
  search.focus();
  browser.crossBreakpoint(true);
  assert.equal(document.activeElement, search);
});

test('crossing down to the mobile width moves focus off the links it hides', async () => {
  const { document, button, firstLink, browser } = await homepage();
  firstLink.focus();
  browser.crossBreakpoint(false);
  assert.equal(document.activeElement, button);
});

test('crossing down to the mobile width recovers focus the browser already dropped from a link', async () => {
  const { document, button, firstLink, browser } = await homepage();
  firstLink.focus();
  firstLink.blur();
  browser.crossBreakpoint(false);
  assert.equal(document.activeElement, button);
});
