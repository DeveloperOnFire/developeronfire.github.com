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
  [{{ post.title }}]({{ BASE_PATH }}{{ post.url }})
  {{ post.date | date_to_string }}
  <audio src="{{ post.link }}" controls="controls"></audio>
  [Download]({{ post.link }}){:target="_blank"}
{% endfor %}

## Recent Shows

{% for post in site.posts limit:6 offset:1 %}
  [{{ post.title }}]({{ BASE_PATH }}{{ post.url }})
  {{ post.date | date_to_string }}
{% endfor %}
