// Runs the site's real scripts against a real rendered page in jsdom. The page comes
// from the build (SITE_DIR or _site), so a template that drifts from what a script
// expects fails here too. Each of the page's own script tags is replaced by the current
// source file, in place and in order; third-party scripts are dropped. Only browser
// features jsdom lacks are stood in for, and the scripts themselves are never altered.
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..', '..');
const SITE = process.env.SITE_DIR || path.join(ROOT, '_site');
const SCRIPT_TAG = /<script\b[^>]*>[\s\S]*?<\/script>/g;
const OWN_SCRIPT = /src="\/assets\/themes\/on-fire\/scripts\/([\w-]+\.js)"/;

function pageWithOwnScriptsInline(page) {
  const file = path.join(SITE, page);
  if (!fs.existsSync(file)) {
    throw new Error(`${file} is missing; build the site first (bin/test does)`);
  }
  return fs.readFileSync(file, 'utf8').replace(SCRIPT_TAG, (tag) => {
    const own = tag.match(OWN_SCRIPT);
    if (!own) {
      return '';
    }
    return `<script>${fs.readFileSync(path.join(ROOT, 'assets/themes/on-fire/scripts', own[1]), 'utf8')}</script>`;
  });
}

function jsonResponse(body) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

function errorResponse(body) {
  return { ok: false, status: 500, json: () => Promise.resolve(body) };
}

// fetch: what window.fetch does, as a function of the requested URL.
function loadPage(page, { fetch = () => Promise.reject(new Error('no network in tests')) } = {}) {
  const browser = { fetchCalls: [], scrolledIntoView: [], plays: 0, seeks: [], mediaListeners: [] };

  const dom = new JSDOM(pageWithOwnScriptsInline(page), {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
    beforeParse(window) {
      window.fetch = (url) => {
        browser.fetchCalls.push(url);
        return fetch(url);
      };
      window.matchMedia = () => ({
        addEventListener: (type, listener) => browser.mediaListeners.push(listener),
      });
      window.Element.prototype.scrollIntoView = function scrollIntoView() {
        browser.scrolledIntoView.push(this);
      };
      if (!('innerText' in window.HTMLElement.prototype)) {
        Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
          get() { return this.textContent; },
          set(value) { this.textContent = value; },
        });
      }
      window.HTMLMediaElement.prototype.play = function play() {
        browser.plays += 1;
        return Promise.resolve();
      };
      Object.defineProperty(window.HTMLMediaElement.prototype, 'currentTime', {
        get() { return browser.seeks[browser.seeks.length - 1] ?? 0; },
        set(value) { browser.seeks.push(value); },
      });
    },
  });

  browser.crossBreakpoint = (toDesktop) => browser.mediaListeners.forEach((listener) => listener({ matches: toDesktop }));
  return { window: dom.window, document: dom.window.document, browser };
}

// Lets pending promise chains finish: fetch, response.json() and the handlers after them.
function settle() {
  return new Promise((resolve) => setImmediate(resolve));
}

function press(window, target, key) {
  target.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

module.exports = { loadPage, jsonResponse, errorResponse, settle, press };
