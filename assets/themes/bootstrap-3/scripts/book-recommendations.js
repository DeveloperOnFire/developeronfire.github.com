// Book recommendations: groups every recommendation made on the show by book,
// most-recommended first, and lists the episodes that recommended each one.

function compareBooks(book0, book1) {
  if (book0.recommenders.length !== book1.recommenders.length) {
    return book1.recommenders.length - book0.recommenders.length;
  }
  return book0.title.localeCompare(book1.title);
}

function groupBooks(recommendations) {
  var booksByKey = {};
  var books = [];
  recommendations.forEach(function (recommendation) {
    var key = [recommendation.url, recommendation.title, recommendation.author].join('\n');
    if (!booksByKey[key]) {
      booksByKey[key] = {
        url: recommendation.url,
        title: recommendation.title,
        author: recommendation.author,
        recommenders: []
      };
      books.push(booksByKey[key]);
    }
    booksByKey[key].recommenders.push(recommendation.recommended_by);
  });
  return books.sort(compareBooks);
}

if (typeof module !== 'undefined') {
  module.exports = { groupBooks: groupBooks };
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    var bookRecommendationsList = document.getElementById('book-recommendations');
    fetch('/book-recommendations.json').then(function (response) {
      if (!response.ok) {
        throw new Error('book-recommendations.json responded with ' + response.status);
      }
      return response.json();
    }).then(function (recommendations) {
      groupBooks(recommendations).forEach(function (book) {
        var item = document.createElement('li');
        var link = document.createElement('a');
        link.href = book.url;
        link.innerText = book.title + ' - ' + book.author;
        var recommendersList = document.createElement('ul');
        book.recommenders.forEach(function (recommender) {
          var recommenderItem = document.createElement('li');
          var recommenderLink = document.createElement('a');
          recommenderLink.href = recommender.url;
          recommenderLink.innerText = recommender.title;
          recommenderItem.appendChild(recommenderLink);
          recommendersList.appendChild(recommenderItem);
        });
        item.appendChild(link);
        item.appendChild(recommendersList);
        bookRecommendationsList.appendChild(item);
      });
    }).catch(function () {
      var failure = document.createElement('li');
      failure.innerText = 'The book list could not be loaded right now.';
      bookRecommendationsList.appendChild(failure);
    });
  });
}
