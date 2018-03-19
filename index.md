---
layout: page
title: Developer On Fire
tagline: Inspiring software developers tell their stories
---
{% include JB/setup %}

## Latest Episode

{% for post in site.categories.Podcast limit:1 %}
  <div class="row">
    <div class="text-center">
      {% if post.guests %}
        {% for guest in post.guests %}
          <img class="img guest" src="{{ guest.image }}" />
        {% endfor %}
      {% else %}
        <img class="img guest" src="{{ post.image }}" />
      {% endif %}
    </div>
    <div class="col-lg-9 text-center vertical-center">
      <div>
        <a href="{{ BASE_PATH }}{{ post.url }}">{{ post.title }}</a>
      </div>
    </div>
    <div class="col-12 medium">
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

{% for post in site.categories.Podcast limit:6 offset:1 %}
  [{{ post.title }}]({{ BASE_PATH }}{{ post.url }})
  {{ post.date | date_to_string }}
{% endfor %}
