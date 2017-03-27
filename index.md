---
layout: page
title: Developer On Fire
tagline: Stories from inspiring people in and around software
---
{% include JB/setup %}

## Latest Episode

{% for post in site.categories.Podcast limit:1 %}
  <div class="row">
    <div class="col-xs-6 col-sm-4 col-md-2 col-lg-2 text-center">
      {% if post.guests %}
        {% for guest in post.guests %}
          <img class="img guest" src="{{ guest.image }}" />
        {% endfor %}
      {% else %}
        <img class="img guest" src="{{ post.image }}" />
      {% endif %}
    </div>
    <div class="col-xs-6 col-sm-8 col-md-10 col-lg-10 text-center vertical-center">
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
