const test = require('node:test');
const assert = require('node:assert/strict');
const { isMenuOpen, setMenuOpen, closesMenu } = require('../../assets/themes/on-fire/scripts/site-menu.js');

function fakeButton(expanded) {
  const attributes = { 'aria-expanded': String(expanded) };
  return {
    getAttribute: (name) => attributes[name],
    setAttribute: (name, value) => { attributes[name] = value; },
  };
}

function fakeMenu() {
  const classes = new Set();
  return {
    classes,
    classList: { toggle: (name, on) => { if (on) { classes.add(name); } else { classes.delete(name); } } },
  };
}

test('isMenuOpen is true when the button is expanded', () => {
  assert.equal(isMenuOpen(fakeButton(true)), true);
});

test('isMenuOpen is false when the button is collapsed', () => {
  assert.equal(isMenuOpen(fakeButton(false)), false);
});

test('setMenuOpen marks the button expanded when opening', () => {
  const button = fakeButton(false);
  setMenuOpen(button, fakeMenu(), true);
  assert.equal(button.getAttribute('aria-expanded'), 'true');
});

test('setMenuOpen marks the button collapsed when closing', () => {
  const button = fakeButton(true);
  setMenuOpen(button, fakeMenu(), false);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
});

test('setMenuOpen names the button for what it will do next', () => {
  const button = fakeButton(false);
  setMenuOpen(button, fakeMenu(), true);
  assert.equal(button.getAttribute('aria-label'), 'Close menu');
});

test('setMenuOpen shows the menu when opening', () => {
  const menu = fakeMenu();
  setMenuOpen(fakeButton(false), menu, true);
  assert.equal(menu.classes.has('open'), true);
});

test('setMenuOpen hides the menu when closing', () => {
  const menu = fakeMenu();
  menu.classes.add('open');
  setMenuOpen(fakeButton(true), menu, false);
  assert.equal(menu.classes.has('open'), false);
});

test('closesMenu is true for Escape while the menu is open', () => {
  assert.equal(closesMenu({ key: 'Escape', target: { id: 'menu-link' } }, fakeButton(true)), true);
});

test('closesMenu is false for Escape while the menu is closed', () => {
  assert.equal(closesMenu({ key: 'Escape', target: { id: 'menu-link' } }, fakeButton(false)), false);
});

test('closesMenu is false for other keys', () => {
  assert.equal(closesMenu({ key: 'Enter', target: { id: 'menu-link' } }, fakeButton(true)), false);
});

test('closesMenu leaves Escape in the search box to the search', () => {
  assert.equal(closesMenu({ key: 'Escape', target: { id: 'search' } }, fakeButton(true)), false);
});
