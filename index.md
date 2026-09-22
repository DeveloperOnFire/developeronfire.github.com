---
layout: page
title: Developer On Fire
tagline: Inspiring software developers tell their stories
---
{% include JB/setup %}

## Recent Shows

{% for post in site.categories.Podcast limit:6 %}

  <div class="row episode">
    <div class="col-lg-2 col-sm-4 col-xs-12 text-center">
      {% if post.guests %}
        {% for guest in post.guests %}
          <div>
            <img class="img guest" src="{{ guest.image }}" alt="{{ guest.name }}" />
          </div>
          <div>
            <a href="{{ BASE_PATH }}{{ post.url }}">{{ guest.name }}</a>
          </div>
        {% endfor %}
      {% else %}
        <div>
          <img class="img guest" src="{{ post.image }}" alt="{{ post.title }}" />
        </div>
      {% endif %}
    </div>
    <div class="col-lg-7 col-sm-8 col-xs-12 text-left text-center">
      <div>
        <a href="{{ BASE_PATH }}{{ post.url }}">{{ post.title }}</a>
      </div>
      <div>
        <audio src="{{ post.link }}" controls="controls" preload="none"></audio>
      </div>
      <div>
        <a href="{{ post.link }}" target="_blank" rel="noopener noreferrer" class="btn btn-danger">Download MP3</a>
      </div>
    </div>
    <div class="col-lg-3 col-sm-12 col-xs-12 text-left text-left">
      &nbsp;
    </div>
  </div>
{% endfor %}
