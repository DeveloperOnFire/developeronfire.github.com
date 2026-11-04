// Mobile menu: the header's menu button shows and hides the navigation and search.
// Loaded synchronously in <head>: the js class it adds is what collapses the menu, so
// the menu is closed from the first paint, and stays open if this file fails to load.

function isMenuOpen(button) {
  return button.getAttribute('aria-expanded') === 'true';
}

function setMenuOpen(button, menu, open) {
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.classList.toggle('open', open);
}

// Escape belongs to the search box while it has focus: there it clears the search.
function closesMenu(event, button) {
  return event.key === 'Escape' && isMenuOpen(button) && event.target.id !== 'search';
}

if (typeof module !== 'undefined') {
  module.exports = { isMenuOpen: isMenuOpen, setMenuOpen: setMenuOpen, closesMenu: closesMenu };
}

if (typeof document !== 'undefined') {
  document.documentElement.classList.add('js');

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.querySelector('.menu-toggle');
    var menu = button && document.getElementById(button.getAttribute('aria-controls'));
    if (!menu) {
      return;
    }

    button.addEventListener('click', function () {
      setMenuOpen(button, menu, !isMenuOpen(button));
    });

    document.addEventListener('keydown', function (event) {
      if (closesMenu(event, button)) {
        setMenuOpen(button, menu, false);
        button.focus();
      }
    });

    var lastFocused = null;
    document.addEventListener('focusin', function (event) {
      lastFocused = event.target;
    });

    // Crossing the breakpoint hides whichever control has focus: the button going up to
    // desktop, the links going down to mobile. Keep focus on the one that stays visible.
    // The browser may already have dropped focus from the hidden control by the time this
    // runs, leaving it on the body, so fall back to where focus last was.
    window.matchMedia('(min-width: 1000px)').addEventListener('change', function (event) {
      var focused = document.activeElement === document.body ? lastFocused : document.activeElement;
      if (event.matches) {
        setMenuOpen(button, menu, false);
        if (focused === button) {
          menu.querySelector('a').focus();
        }
      } else if (menu.contains(focused)) {
        button.focus();
      }
    });
  });
}
