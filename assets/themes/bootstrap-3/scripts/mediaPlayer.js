// Episode player: clicking a chapter timestamp jumps the audio to that point.

// "m:ss" or "h:mm:ss" (or bare seconds) to seconds; null when the text is not a timestamp.
function parseTimeToSeconds(time) {
  var timeParts = String(time).trim().split(':');
  if (timeParts.length > 3 || !timeParts.every(function (part) { return /^\d+$/.test(part); })) {
    return null;
  }
  var seconds = 0;
  for (var i = 0; i < timeParts.length; ++i) {
    var timePartPower = timeParts.length - i - 1;
    seconds += Number(timeParts[i]) * Math.pow(60, timePartPower);
  }
  return seconds;
}

if (typeof module !== 'undefined') {
  module.exports = { parseTimeToSeconds: parseTimeToSeconds };
}

if (typeof document !== 'undefined') {
  (function () {
    var player = document.getElementById('episode-audio');
    if (!player) {
      return;
    }
    var chapterTimestamps = document.getElementsByClassName('chapter-timestamp');
    for (var i = 0; i < chapterTimestamps.length; ++i) {
      (function (timeElement) {
        timeElement.parentElement.addEventListener('click', function (event) {
          event.preventDefault();
          var seconds = parseTimeToSeconds(timeElement.textContent);
          if (seconds === null) {
            return;
          }
          player.currentTime = seconds;
          player.play();
        });
      })(chapterTimestamps[i]);
    }
  })();
}
