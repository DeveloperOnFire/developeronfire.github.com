// Episode search: filters the episode index (search.json) by title as the
// visitor types, and lets the keyboard pick a result.

// Case, accents and surrounding spaces do not count: "lopez " finds "López".
function searchable(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function filterPosts(posts, query) {
  if (query === null || query === undefined || query.match(/^\s*$/) !== null) {
    return null;
  }
  var needle = searchable(query);
  return posts.filter(function (post) {
    return searchable(post.title).indexOf(needle) !== -1;
  });
}

if (typeof module !== 'undefined') {
  module.exports = { filterPosts: filterPosts };
}

if (typeof document !== 'undefined') {
  (function () {
    var episodeIndex = null;

    // The index is fetched once per page and then reused for every keystroke.
    function loadEpisodeIndex() {
      if (episodeIndex === null) {
        episodeIndex = fetch('/search.json').then(function (response) {
          if (!response.ok) {
            throw new Error('search.json responded with ' + response.status);
          }
          return response.json();
        });
        episodeIndex.catch(function () { episodeIndex = null; });
      }
      return episodeIndex;
    }

    function resultsContainer() {
      return document.getElementsByClassName('search-result-container')[0];
    }

    function resultsList() {
      return resultsContainer().getElementsByClassName('search-result')[0];
    }

    function clearResults() {
      var list = resultsList();
      while (list.firstChild) {
        list.removeChild(list.firstChild);
      }
    }

    function messagePage(message) {
      clearResults();
      resultsContainer().classList.add('shown');
      var notification = document.createElement('li');
      notification.innerText = message;
      resultsList().appendChild(notification);
    }

    function noResultsPage() {
      messagePage('No results found');
    }

    function searchUnavailablePage() {
      messagePage('Search is unavailable right now.');
    }

    function hideResultsPage() {
      clearResults();
      resultsContainer().classList.remove('shown');
    }

    function layoutResultsPage(posts) {
      clearResults();
      resultsContainer().classList.add('shown');
      var list = resultsList();
      for (var i = 0; i < posts.length; ++i) {
        var link = document.createElement('a');
        var image = document.createElement('img');
        var text = document.createElement('span');
        var post = document.createElement('li');
        link.href = posts[i].url;
        text.innerText = posts[i].title;
        image.src = posts[i].image;
        image.alt = '';
        image.loading = 'lazy';
        image.classList.add('search-result-image');
        if (i === 0) {
          post.classList.add('selected');
        }
        link.appendChild(image);
        link.appendChild(text);
        post.appendChild(link);
        list.appendChild(post);
      }
    }

    function currentSelection() {
      return resultsList().getElementsByClassName('selected')[0];
    }

    function selectResult(move) {
      var list = resultsList();
      // A message row is not a result, so there is nothing to select.
      if (list.getElementsByTagName('a').length === 0) {
        return;
      }
      var selected = currentSelection();
      var index = move([].slice.call(list.children).indexOf(selected));
      if (index < 0) {
        index = list.children.length - 1;
      }
      if (index >= list.children.length) {
        index = 0;
      }
      if (selected) {
        selected.classList.remove('selected');
      }
      list.children[index].classList.add('selected');
      // The dropdown scrolls, so keep the keyboard selection in view.
      list.children[index].scrollIntoView({ block: 'nearest' });
    }

    var searchBox = document.getElementById('search');
    if (!searchBox) {
      return;
    }

    document.documentElement.classList.add('search-ready');

    var searchArea = searchBox.form;

    searchBox.addEventListener('input', function () {
      var query = searchBox.value;
      if (query === null || query.length === 0) {
        hideResultsPage();
        return;
      }
      loadEpisodeIndex().then(function (posts) {
        // Only render for the text still in the box; earlier keystrokes may resolve later.
        if (searchBox.value !== query) {
          return;
        }
        var matches = filterPosts(posts, query);
        if (matches === null) {
          hideResultsPage();
        } else if (matches.length === 0) {
          noResultsPage();
        } else {
          layoutResultsPage(matches);
        }
      }).catch(function () {
        if (searchBox.value === query) {
          searchUnavailablePage();
        }
      });
    });

    searchBox.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        searchBox.value = '';
        hideResultsPage();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectResult(function (i) { return i - 1; });
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectResult(function (i) { return i + 1; });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        var selection = currentSelection();
        var link = selection && selection.getElementsByTagName('a')[0];
        if (link) {
          window.location = link.href;
        }
      }
    });

    // Escape from a focused result. The box is about to be emptied and the result
    // removed, so focus goes back to the box, and the mobile menu stays as it was.
    searchArea.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && event.target !== searchBox) {
        event.stopPropagation();
        searchBox.value = '';
        hideResultsPage();
        searchBox.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (!searchArea.contains(event.target)) {
        hideResultsPage();
      }
    });

    // Only when focus has somewhere else to go: Safari does not focus a link on click,
    // so during a click on a result focus goes nowhere, and closing then would remove
    // the result before the click lands. Clicks away are handled above.
    searchArea.addEventListener('focusout', function (event) {
      if (event.relatedTarget && !searchArea.contains(event.relatedTarget)) {
        hideResultsPage();
      }
    });
  })();
}
