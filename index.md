---
layout: page
title: Developer On Fire
tagline: Podcast with inspiring interviews with successful software developers, architects, testers, and other professionals with stories of success, failure, excellence, and inspiration.
---
{% include JB/setup %}

Developer On Fire with Dave Rael is an interview podcast with inspiring and successful software professionals telling personal stories about their experiences with delivering value.  It is a chance for you to get to know your favorite geeks and learn more about who they are, how they deliver, and what makes them tick.

## Latest Episode

{% for post in site.posts limit:1 %}
  <span>{{ post.date | date_to_string }}</span> &raquo; <a href="{{ BASE_PATH }}{{ post.url }}">{{ post.title }}</a>
{% endfor %}
