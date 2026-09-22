// Episode player: clicking a chapter timestamp jumps the audio to that point.

function parseTimeToSeconds(time) {
  var timeParts = String(time).trim().split(':');
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
          player.currentTime = parseTimeToSeconds(timeElement.textContent);
          player.play();
        });
      })(chapterTimestamps[i]);
    }
  })();
}
