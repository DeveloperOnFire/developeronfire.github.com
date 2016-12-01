---
layout: page
title: Developer On Fire
tagline: Podcast with inspiring interviews with successful software developers, architects, testers, and other professionals with stories of success, failure, excellence, and inspiration.
redirect_from:
- "/Podcast/"
---
{% include JB/setup %}

## Latest Episode

{% for post in site.posts limit:1 %}
  <div class="row">
    <div class="col-xs-6 col-sm-4 col-md-2 text-center">
      <img class="img guest" src="{{ post.image }}" />
    </div>
    <div class="col-xs-6 col-sm-8 col-md-10 text-center vertical-center">
      <div>
        <a href="{{ BASE_PATH }}{{ post.url }}">{{ post.title }}</a>
      </div>
    </div>
    <div class="col-xs-12 medium">
      <div>
        <audio src="{{ post.link }}" controls="controls"></audio>
      </div>
      <div>
        <a href="{{ post.link }}" target="_blank">Download</a>
      </div>
    </div>
  </div>
{% endfor %}

## Recent Shows

{% for post in site.posts limit:6 offset:1 %}
  [{{ post.title }}]({{ BASE_PATH }}{{ post.url }})
  {{ post.date | date_to_string }}
{% endfor %}
