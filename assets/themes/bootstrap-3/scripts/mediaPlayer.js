function audioPlayer(){
  return document.getElementById('episode-audio');
}

function playPause() {
  self.isPlaying() ? player.pause() : player.play();
}

function play(time) {
  audioPlayer().play();
}

function jumpAudioToTime(time) {
  audioPlayer().currentTime = time;
  play();
}

function parseTimeToSeconds(time) {
  var timeParts = time.split(':');
  var seconds = 0;
  for (var i = 0; i < timeParts.length; ++i) {
    var timePartPower = timeParts.length - i - 1;
    seconds += timeParts[i] * (Math.pow(60,timePartPower));
  }
  return seconds;
}

(function init(){
  var jumpAudioLinks = document.getElementsByClassName('chapter-timestamp');
  for(var i = 0;i<jumpAudioLinks.length; ++i) {
    (function(timeElement) {
      timeElement.parentElement.addEventListener('click', function() {
        var time = parseTimeToSeconds(timeElement.innerHTML);
        jumpAudioToTime(time);
      });
    })(jumpAudioLinks[i]);
  }
})();
