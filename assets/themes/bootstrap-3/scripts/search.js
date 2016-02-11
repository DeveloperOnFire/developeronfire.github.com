function noResultsPage() {
  var searchResultsContainer = document.getElementsByClassName('search-result-container')[0];
  var searchResultsList = searchResultsContainer.getElementsByClassName('search-result')[0];
  while (searchResultsList.firstChild) {
    searchResultsList.removeChild(searchResultsList.firstChild);
  }
  searchResultsContainer.classList.add('shown')
  var emptyListNotification = document.createElement('li');
  emptyListNotification.innerText = 'No results found';
  searchResultsList.appendChild(emptyListNotification);
}

function hideResultsPage() {
  var searchResultsContainer = document.getElementsByClassName('search-result-container')[0];
  var searchResultsList = searchResultsContainer.getElementsByClassName('search-result')[0];
  searchResultsContainer.classList.remove('shown')
  while (searchResultsList.firstChild) {
    searchResultsList.removeChild(searchResultsList.firstChild);
  }
  searchResultsContainer.classList.add('shown')
}

function filterPosts(data, query) {
  if(query === null || query.match(/^\s*$/) !== null) {
    return null;
  }
  return data.filter(function(post) {return post != null && post.title.toLowerCase().indexOf(query.toLowerCase()) != -1})
}

function layoutResultsPage(posts) {
  var searchResultsContainer = document.getElementsByClassName('search-result-container')[0];
  var searchResultsList = searchResultsContainer.getElementsByClassName('search-result')[0];
  while (searchResultsList.firstChild) {
    searchResultsList.removeChild(searchResultsList.firstChild);
  }
  searchResultsContainer.classList.add('shown')
  for(var i=0;i<posts.length;++i) {
    var link = document.createElement('a');
    var image = document.createElement('img');
    var post = document.createElement('li');
    link.href = posts[i].url;
    link.innerText = posts[i].title;
    image.src = posts[i].image;
    image.classList.add('img');
    image.classList.add('img-circle');
    image.classList.add('search-result-image');
    if(i===0) {
      post.classList.add('selected');
    }
    post.appendChild(image);
    post.appendChild(link);
    searchResultsList.appendChild(post);
  }
}

var searchBox = document.getElementById('search')
searchBox.addEventListener('input', function() {
  var query = searchBox.value;
  if (query !== null && query.length > 0) {
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
  else {
    hideResultsPage();
  }
});

searchBox.addEventListener('keydown', function(event) {
  if(event.keyCode === 27) {
    searchBox.value = '';
  }
  var moveSelection = false;
  var selectionMoveUp = false;
  if(event.keyCode == 38) {
    moveSelection = true;
    selectionMoveUp = true;
  }
  if(event.keyCode == 40) {
    moveSelection = true;
  }
  if(event.keyCode == 13) {
    event.preventDefault();
    window.location = currentSelection().getElementsByTagName('a')[0].href;
    return false;
  }
  if(moveSelection){
    if(selectionMoveUp){
      selectPreviousResult();
    }
    else {
      selectNextResult();
    }
  }
});

function selectPreviousResult() {
  selectResult(function(i){ return i - 1});
}

function selectNextResult() {
  selectResult(function(i){ return i + 1});
}

function currentSelection(searchResultsList) {
  if(!searchResultsList) {
    searchResultsList = document.getElementsByClassName('search-result')[0];
  }
  return searchResultsList.getElementsByClassName('selected')[0];
}

function currentSelectionIndex() {
  var searchResultsList = document.getElementsByClassName('search-result')[0];
  return [].slice.call(searchResultsList.children).indexOf(currentSelection(searchResultsList));
}

function selectResult(selectionMovementFunction) {
  var searchResultsList = document.getElementsByClassName('search-result')[0];
  var i = selectionMovementFunction(currentSelectionIndex());
  if(i < 0) {
    i = searchResultsList.children.length - 1;
  }
  if(i >= searchResultsList.children.length) {
    i = 0;
  }
  currentSelection(searchResultsList).classList.remove('selected');
  searchResultsList.children[i].classList.add('selected');
}
