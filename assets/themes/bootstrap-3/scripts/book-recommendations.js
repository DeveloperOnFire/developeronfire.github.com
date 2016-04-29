var DataGrouper = (function() {
    var has = function(obj, target) {
        return _.any(obj, function(value) {
            return _.isEqual(value, target);
        });
    };

    var keys = function(data, names) {
        return _.reduce(data, function(memo, item) {
            var key = _.pick(item, names);
            if (!has(memo, key)) {
                memo.push(key);
            }
            return memo;
        }, []);
    };

    var group = function(data, names) {
        var stems = keys(data, names);
        return _.map(stems, function(stem) {
            return {
                key: stem,
                vals:_.map(_.where(data, stem), function(item) {
                    return _.omit(item, names);
                })
            };
        });
    };

    group.register = function(name, converter) {
        return group[name] = function(data, names) {
            return _.map(group(data, names), converter);
        };
    };

    return group;
}());
DataGrouper.register("recommenders", function(item) {
  return _.extend({}, item.key, {recommenders: _.reduce(item.vals, function(memo, book) {
    memo.push(book.recommended_by);
    return memo;
  }, [])});
});
document.addEventListener("DOMContentLoaded", function() {
  $.getJSON("/book-recommendations.json", function(bookData) {
    bookData.pop();
    books = DataGrouper.recommenders(bookData, ["url", "title", "author"]).sort(function(book0, book1) {
      if(book0.recommenders.length > book1.recommenders.length){
        return -1;
      }
      if(book0.recommenders.length < book1.recommenders.length){
        return 1;
      }
      return book0.title > book1.title;
    });
    var bookRecommendationsList = document.getElementById("book-recommendations");
    for (var i = 0; i < books.length; i++) {
      var link = document.createElement("a");
      var book = document.createElement("li");
      link.href = books[i].url;
      link.innerText = books[i].title + " - " + books[i].author;
      var recommendersList = document.createElement("ul");
      for (var j = 0; j < books[i].recommenders.length; j++) {
        var recommender = document.createElement("li");
        var recommenderLink = document.createElement("a");
        recommenderLink.href = books[i].recommenders[j].url;
        recommenderLink.innerText = books[i].recommenders[j].title;
        recommender.appendChild(recommenderLink);
        recommendersList.appendChild(recommender);
      }
      book.appendChild(link);
      book.appendChild(recommendersList);
      bookRecommendationsList.appendChild(book);
    }
  });
});
