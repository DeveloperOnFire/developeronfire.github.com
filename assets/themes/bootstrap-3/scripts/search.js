// Episode search: filters the episode index (search.json) by title as the
// visitor types, and lets the keyboard pick a result.

function filterPosts(posts, query) {
  if (query === null || query === undefined || query.match(/^\s*$/) !== null) {
    return null;
  }
  var needle = query.toLowerCase();
  return posts.filter(function (post) {
    return post !== null && post.title.toLowerCase().indexOf(needle) !== -1;
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

    function noResultsPage() {
      clearResults();
      resultsContainer().classList.add('shown');
      var emptyListNotification = document.createElement('li');
      emptyListNotification.innerText = 'No results found';
      resultsList().appendChild(emptyListNotification);
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
        image.classList.add('img', 'img-circle', 'search-result-image');
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
      if (list.children.length === 0) {
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
    }

    var searchBox = document.getElementById('search');
    if (!searchBox) {
      return;
    }

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
        noResultsPage();
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
        if (selection) {
          window.location = selection.getElementsByTagName('a')[0].href;
        }
      }
    });
  })();
}
