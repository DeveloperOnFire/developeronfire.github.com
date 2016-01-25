function noResultsPage() {
  var searchResultsContainer = document.getElementsByClassName('search-result-container')[0];
  var searchResultsList = searchResultsContainer.getElementsByClassName("search-result")[0];
  while (searchResultsList.firstChild) {
    searchResultsList.removeChild(searchResultsList.firstChild);
  }
  searchResultsContainer.classList.add('shown')
  var emptyListNotification = document.createElement("li");
  emptyListNotification.innerText = "No results found";
  searchResultsList.appendChild(emptyListNotification);
}

function hideResultsPage() {
  var searchResultsContainer = document.getElementsByClassName('search-result-container')[0];
  var searchResultsList = searchResultsContainer.getElementsByClassName("search-result")[0];
  searchResultsContainer.classList.remove('shown')
  while (searchResultsList.firstChild) {
    searchResultsList.removeChild(searchResultsList.firstChild);
  }
  searchResultsContainer.classList.add("shown")
}

function filterPosts(data, query) {
  if(query === null || query.match(/^\s*$/) !== null) {
    return null;
  }
  return data.filter(function(post) {return post != null && post.title.toLowerCase().indexOf(query.toLowerCase()) != -1})
}

function layoutResultsPage(posts) {
  var searchResultsContainer = document.getElementsByClassName("search-result-container")[0];
  var searchResultsList = searchResultsContainer.getElementsByClassName("search-result")[0];
  while (searchResultsList.firstChild) {
    searchResultsList.removeChild(searchResultsList.firstChild);
  }
  searchResultsContainer.classList.add("shown")
  for(var i=0;i<posts.length;++i) {
    var link = document.createElement("a");
    var post = document.createElement("li");
    link.href = posts[i].url;
    link.innerText = posts[i].title;
    post.appendChild(link);
    searchResultsList.appendChild(post);
  }
}

var searchBox = document.getElementById('search')
searchBox.addEventListener('input', function() {
  var query = searchBox.value;
  if (query !== null) {
    $.getJSON('/search.json', function(data) {
      posts = filterPosts(data, query);
      if(posts == null) {
        hideResultsPage();
      }
      if (posts.length === 0) {
        noResultsPage();
      } else {
        layoutResultsPage(posts);
      }
    });
  }
});
