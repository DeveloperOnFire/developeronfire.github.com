# Checks against the rendered site (_site) and the episode sources.
# Run via bin/test, which builds the site first. SITE_DIR overrides the
# rendered location.
require 'minitest/autorun'
require 'json'
require 'yaml'
require 'digest'
require 'nokogiri'
require 'jekyll'
require 'pathname'
require 'uri'

class SiteTest < Minitest::Test
  SOURCE = Pathname.new(File.expand_path('..', __dir__))
  SITE = Pathname.new(ENV.fetch('SITE_DIR', SOURCE.join('_site').to_s))

  # Hosts the site knowingly loads scripts from. Disqus injects its embed
  # script at runtime and so never appears as a script[src] in the markup.
  # platform.twitter.com stays only for three old blog posts that embed tweets
  # in their bodies; no layout loads it.
  KNOWN_SCRIPT_HOSTS = %w[cdn.trackjs.com platform.twitter.com].freeze

  # The only asset left at the old theme path: a 2015 blog post (and so blog-rss.xml)
  # links to it by absolute URL, and neither may change.
  LEGACY_THEME_LOGO = 'assets/themes/bootstrap-3/images/logo.png'

  SCRIPTS = '/assets/themes/on-fire/scripts'

  # Self-hosted fonts, pinned to the files in @fontsource/inter and
  # @fontsource/space-grotesk 5.3.0 so an edit or bad merge cannot change them unnoticed.
  FONT_FILES = {
    'inter-latin-400-normal.woff2' => '8909904ab6c872eb994093482a88a28eca2cd95912d7b6fecd72103b0dc07edc',
    'inter-latin-500-normal.woff2' => 'f3779f1efccc4bdcdf9c0a02ab95bf6bd092ed09c48c08cedc725889edd1d19f',
    'inter-latin-600-normal.woff2' => 'f9a06e79cd3a2a20951c0f0e28f66dd0e6d3fda73911d640a2125c8fcb78f21a',
    'space-grotesk-latin-500-normal.woff2' => '1b1a8131d9edf975d9decee81e2f2bf504812f7a4f498e5500f28a613e22e64c',
    'space-grotesk-latin-700-normal.woff2' => '35f8aec56cfd5cbfdb03cc68733a54a0b05bb3617ffcd5fd332badc0b045ca55'
  }.freeze

  # The show is finished: these pages used to sell or book something.
  CLOSED_OFFER_PAGES = %w[sponsors/media-kit.html guest-information.html subscribed/index.html punch-fear.html].freeze

  ACTIVE_SHOW_PHRASES = [
    'publishes every week', 'sponsorship rate', 'Discounts are available', 'Schedule Interview',
    'This will book', 'schedule a time', 'keep up with what is happening', "We'll be in touch",
    'will be updated with more stories'
  ].freeze

  MAIN_NAVIGATION = ['Episodes', 'Subscribe', 'About', 'Blog', 'Book Recommendations'].freeze

  def setup
    assert SITE.join('index.html').exist?, "no rendered site at #{SITE}; run bin/test"
  end

  # --- episode sources -------------------------------------------------------

  def test_every_episode_declares_at_least_one_guest
    assert_empty episodes.select { |episode| episode.fetch('guests', []).empty? }.map { |episode| episode['title'] }
  end

  def test_every_episode_source_renders_a_page
    assert_empty episode_pages.reject { |page| SITE.join(page).file? }
  end

  def test_every_blog_source_renders_a_page
    assert_empty blog_pages.reject { |page| SITE.join(page).file? }
  end

  def test_every_episode_guest_has_a_name
    assert_empty episodes.select { |episode| episode.fetch('guests', []).any? { |guest| guest['name'].to_s.strip.empty? } }.map { |episode| episode['title'] }
  end

  def test_every_episode_guest_name_is_free_of_surrounding_whitespace
    assert_empty episodes.flat_map { |episode| episode.fetch('guests', []).map { |guest| guest['name'] } }.select { |name| name != name.to_s.strip }
  end

  def test_every_episode_guest_has_an_image
    assert_empty episodes.select { |episode| episode.fetch('guests', []).any? { |guest| guest['image'].to_s.empty? } }.map { |episode| episode['title'] }
  end

  def test_every_guest_twitter_value_is_a_valid_handle
    assert_empty all_guests.map { |guest| guest['twitter'] }.compact.reject { |handle| handle.to_s.match?(/\A[A-Za-z0-9_]{1,15}\z/) }
  end

  def test_every_guest_blog_value_is_an_http_url
    assert_empty all_guests.map { |guest| guest['blog'] }.compact.reject { |blog| blog.to_s.match?(%r{\Ahttps?://\S+\z}) }
  end

  def test_no_episode_uses_the_retired_flat_guest_fields
    legacy = episodes.select { |episode| episode.keys.intersect?(%w[guest_name guest_blog guest_twitter]) }
    assert_empty legacy.map { |episode| episode['title'] }
  end

  def test_every_post_body_has_balanced_div_tags
    unbalanced = (Dir.glob(SOURCE.join('Podcast/_posts/*')) + Dir.glob(SOURCE.join('Blog/_posts/*'))).select do |path|
      body = body_of(path)
      body.scan(/<div\b/).size != body.scan(%r{</div\s*>}).size
    end
    assert_empty unbalanced.map { |path| File.basename(path) }
  end

  # --- search and book endpoints ---------------------------------------------

  def test_search_index_lists_every_episode
    assert_equal episodes.size, search_index.size
  end

  def test_every_search_index_entry_has_a_title
    assert_empty search_index.select { |entry| entry['title'].to_s.empty? }
  end

  def test_every_search_index_entry_links_to_an_episode_page
    assert_empty search_index.reject { |entry| entry['url'].to_s.start_with?('/podcast/') }.map { |entry| entry['title'] }
  end

  def test_every_search_index_entry_has_an_image
    assert_empty search_index.select { |entry| entry['image'].to_s.empty? }.map { |entry| entry['title'] }
  end

  def test_book_recommendations_endpoint_lists_every_recommendation_from_the_episodes
    assert_equal episodes.sum { |episode| Array(episode['book_recommendations']).size }, book_recommendations.size
  end

  def test_every_book_recommendation_names_the_recommending_episode
    incomplete = book_recommendations.reject do |entry|
      entry['title'].to_s != '' && entry.dig('recommended_by', 'url').to_s.start_with?('/podcast/')
    end
    assert_empty incomplete
  end

  def test_every_book_recommendation_has_a_url
    assert_empty book_recommendations.select { |entry| entry['url'].to_s.strip.empty? }.map { |entry| entry['title'] }
  end

  def test_every_book_recommendation_has_an_author
    assert_empty book_recommendations.select { |entry| entry['author'].to_s.strip.empty? }.map { |entry| entry['title'] }
  end

  # --- feeds -------------------------------------------------------------------

  def test_podcast_feed_lists_every_episode
    assert_equal episodes.size, xml('rss.xml').xpath('/rss/channel/item').size
  end

  def test_podcast_feed_enclosures_are_audio_mpeg
    assert_equal ['audio/mpeg'], xml('rss.xml').xpath('/rss/channel/item/enclosure/@type').map(&:value).uniq
  end

  def test_recent_only_feed_carries_twenty_episodes
    assert_equal 20, xml('recentonly-rss.xml').xpath('/rss/channel/item').size
  end

  def test_every_feed_is_well_formed_xml
    errors = %w[rss.xml recentonly-rss.xml blog-rss.xml atom.xml].flat_map do |feed|
      Nokogiri::XML(SITE.join(feed).read).errors.map { |error| "#{feed}: #{error}" }
    end
    assert_empty errors
  end

  # --- episode page ----------------------------------------------------------------

  def test_single_guest_episode_renders_one_guest_card_named_for_the_guest
    assert_equal ['Aimee Knight'], html(episode_page('episode-452')).css('main .guest img').map { |img| img['alt'] }
  end

  def test_two_guest_episode_renders_a_card_per_guest
    assert_equal 2, html(episode_page('episode-219')).css('main .guest img').size
  end

  def test_no_page_loads_google_analytics
    assert_empty rendered_pages('**/*.html').select { |page| SITE.join(page).read.include?('googletagmanager') }
  end

  def test_every_episode_page_uses_the_episode_layout
    assert_empty episode_pages.reject { |page| html(page).at_css('div.post-full') }
  end

  def test_every_blog_post_uses_the_post_layout
    assert_empty blog_pages.reject { |page| html(page).at_css('div.post-full') }
  end

  # --- navigation ----------------------------------------------------------------

  def test_episode_previous_link_goes_to_the_next_older_episode
    assert_equal episode_url('episode-199'), html(episode_page('episode-200')).at_css('ul.pagination li.prev a')['href']
  end

  def test_episode_next_link_goes_to_the_next_newer_episode
    assert_equal episode_url('episode-201'), html(episode_page('episode-200')).at_css('ul.pagination li.next a')['href']
  end

  def test_oldest_episode_has_no_previous_link
    assert_nil html(episode_page('episode-000')).at_css('ul.pagination li.prev a[href]')
  end

  def test_newest_episode_has_no_next_link
    assert_nil html(episode_page('episode-452')).at_css('ul.pagination li.next a[href]')
  end

  def test_every_episode_page_offers_previous_and_next_navigation
    assert_empty episode_pages.select { |page| html(page).css('ul.pagination li.prev, ul.pagination li.next').size != 2 }
  end

  def test_every_blog_post_offers_previous_and_next_navigation
    assert_empty blog_pages.select { |page| html(page).css('ul.pagination li.prev, ul.pagination li.next').size != 2 }
  end

  def test_blog_post_navigation_stays_within_the_blog
    assert_empty navigation_links_leaving('blog')
  end

  def test_episode_navigation_stays_within_the_podcast
    assert_empty navigation_links_leaving('podcast')
  end

  # --- guest pages ---------------------------------------------------------------

  def test_guest_page_lists_every_appearance_including_early_episodes
    assert_equal 3, html('JeremyClark.html').css('ul.appearances li').size
  end

  def test_disambiguation_page_keeps_namesakes_episodes_apart
    assert_equal [1, 1], html('JaredSmith.html').css('ul.appearances').map { |list| list.css('li').size }
  end

  def test_every_guest_profile_lists_at_least_one_appearance
    empty = guest_pages.keys.flat_map do |page|
      html("#{page}.html").css('ul.appearances').each_with_index.select { |list, _| list.css('li').empty? }.map { |_, i| "#{page} profile #{i + 1}" }
    end
    assert_empty empty
  end

  # --- markup hygiene ------------------------------------------------------------

  def test_layout_links_that_open_a_new_tab_use_noopener
    unsafe = layout_pages.flat_map do |page|
      html(page).xpath('//a[@target="_blank"][not(ancestor::div[@class="content"])]')
                .reject { |a| a['rel'].to_s.split.include?('noopener') }
                .map { |a| "#{page}: #{a['href']}" }
    end
    assert_empty unsafe
  end

  def test_guest_images_have_alt_text
    missing = layout_pages.flat_map do |page|
      html(page).css('img.guest').select { |img| img['alt'].to_s.strip.empty? }.map { |img| "#{page}: #{img['src']}" }
    end
    assert_empty missing
  end

  def test_scripts_load_only_from_this_origin_or_known_services
    foreign = rendered_pages('**/*.html').flat_map do |page|
      html(page).css('script[src]').map { |s| s['src'] }.reject { |src| local?(src) || KNOWN_SCRIPT_HOSTS.include?(host_of(src)) }
    end
    assert_empty foreign.uniq
  end

  def test_local_stylesheets_and_scripts_referenced_by_pages_exist
    missing = rendered_pages('**/*.html').flat_map do |page|
      html(page).css('link[rel="stylesheet"][href], script[src]').map { |node| node['href'] || node['src'] }
                .select { |ref| local?(ref) }.reject { |ref| resolves?(ref, page) }.map { |ref| "#{page}: #{ref}" }
    end
    assert_empty missing.uniq
  end

  def test_closed_offer_pages_use_no_active_show_language
    found = CLOSED_OFFER_PAGES.product(ACTIVE_SHOW_PHRASES).select { |page, phrase| main_text(page).include?(phrase) }
    assert_empty found
  end

  # Dave's training page has its own, separate booking link and is not a closed offer.
  def test_only_the_training_page_links_to_calendly
    assert_equal ['training/index.html'], content_pages.select { |page| html(page).at_css('a[href*="calendly.com"]') }
  end

  def test_media_kit_says_sponsorship_is_closed
    assert_includes main_text('sponsors/media-kit.html'), 'sponsorship is closed'
  end

  def test_guest_information_says_interviews_are_no_longer_booked
    assert_includes main_text('guest-information.html'), 'no longer booking interviews'
  end

  def test_guest_information_keeps_the_standard_questions
    assert_equal 11, html('guest-information.html').css('main li').size
  end

  def test_no_page_links_to_the_ebook_over_plain_http
    assert_empty content_pages.select { |page| html(page).at_css('a[href^="http://traffic.libsyn.com/developeronfire/punch-fear-ebook"]') }
  end

  def test_subscribed_page_offers_the_ebook_as_a_button
    assert html('subscribed/index.html').at_css('main a.button.button-primary[href$="punch-fear-ebook.pdf"]')
  end

  def test_no_page_embeds_the_retired_mailing_list_form
    assert_empty rendered_pages('**/*.html').select { |page| SITE.join(page).read.include?('mc_embed_signup') }
  end

  # Links written into post bodies are content and may rot (several 2014 blog posts
  # link to images that were never migrated); links the layouts emit must not.
  def test_internal_links_from_layouts_resolve
    broken = rendered_pages('**/*.html').flat_map do |page|
      html(page).xpath('//a[@href][not(ancestor::div[@class="content"])]').map { |a| a['href'] }
                .select { |href| local?(href) }.reject { |href| resolves?(href, page) }.map { |href| "#{page}: #{href}" }
    end
    assert_empty broken
  end

  # --- homepage ---------------------------------------------------------------------

  def test_homepage_shows_the_eight_newest_episodes
    assert_equal episode_sources.first(8).map { |episode| episode[:url] }, card_links('index.html')
  end

  def test_homepage_eyebrow_count_equals_the_episode_count
    assert_equal "#{episodes.size} episodes · 2015–2019", html('index.html').at_css('.hero .eyebrow').text
  end

  def test_homepage_primary_button_names_the_episode_count
    assert_equal "Browse all #{episodes.size} episodes", html('index.html').at_css('.hero a[href="/episodes"]').text
  end

  def test_homepage_has_no_audio_players
    assert_empty html('index.html').css('audio')
  end

  def test_homepage_does_not_offer_a_guest_index
    assert_empty html('index.html').css('a').select { |a| a.text.match?(/guests/i) }.map(&:text)
  end

  # --- episode archive --------------------------------------------------------------

  def test_archive_lists_every_episode
    assert_equal episode_sources.map { |episode| episode[:url] }.sort, card_links('episodes.html').sort
  end

  def test_archive_groups_episodes_by_year
    assert_equal %w[2019 2018 2017 2016 2015], html('episodes.html').css('.archive-year h2').map(&:text)
  end

  def test_archive_files_every_card_under_the_year_of_its_episode
    assert_equal episode_urls_by_year.transform_values(&:sort), archive_urls_by_year.transform_values(&:sort)
  end

  def test_archive_lists_each_years_episodes_newest_first
    assert_equal episode_urls_by_year, archive_urls_by_year
  end

  def test_archive_images_load_lazily
    assert_empty html('episodes.html').css('.episode-card img').reject { |img| img['loading'] == 'lazy' }.map { |img| img['src'] }
  end

  def test_archive_images_declare_their_size
    assert_empty html('episodes.html').css('.episode-card img').reject { |img| img['width'] && img['height'] }.map { |img| img['src'] }
  end

  # --- episode cards ----------------------------------------------------------------

  def test_card_shows_episode_number_and_rounded_minutes
    assert_equal 'EP 452 · 43 min', card_for('episode-452').at_css('.episode-card-meta').text
  end

  def test_card_shows_the_guest_name
    assert_equal 'Aimee Knight', card_for('episode-452').at_css('h3').text
  end

  def test_card_shows_the_episode_subject
    assert_equal 'Inspired', card_for('episode-452').at_css('.episode-card-subject').text
  end

  def test_card_names_both_guests_of_a_two_guest_episode
    assert_equal 'Lawrence Sowell & Ben Meyer', card_for('episode-219').at_css('h3').text
  end

  def test_card_shows_a_photo_of_each_guest_of_a_two_guest_episode
    assert_equal 2, card_for('episode-219').css('img').size
  end

  def test_card_finds_the_subject_of_a_two_guest_episode
    assert_equal 'Making Cool Stuff', card_for('episode-219').at_css('.episode-card-subject').text
  end

  def test_card_uses_the_guest_list_when_the_title_names_only_one_of_two_guests
    assert_equal 'Logan Dutkiewicz & Sarah Dutkiewicz', card_for('episode-432').at_css('h3').text
  end

  def test_card_finds_the_subject_of_a_title_written_with_a_colon
    assert_equal 'Simple Programmer', card_for('episode-001').at_css('.episode-card-subject').text
  end

  def test_card_has_no_subject_when_the_title_only_names_the_guest
    assert_nil card_for('episode-278').at_css('.episode-card-subject')
  end

  def test_card_keeps_a_title_that_is_neither_guest_nor_subject_form
    assert_equal 'Episode 0x100', card_for('episode-256').at_css('.episode-card-subject').text
  end

  def test_card_numbers_an_episode_with_no_episode_number_from_its_title
    assert_equal 'EP 230', card_for('episode-230').at_css('.episode-card-meta').text[/EP \d+/]
  end

  def test_card_numbers_an_episode_with_a_wrong_episode_number_from_its_title
    assert_equal 'EP 116', card_for('episode-116').at_css('.episode-card-meta').text[/EP \d+/]
  end

  def test_card_labels_the_bonus_episode
    assert_equal 'Bonus', card_for('bonus-episode').at_css('.episode-card-meta').text[/\A\w+/]
  end

  def test_card_finds_the_subject_of_the_bonus_episode
    assert_equal 'Remote Conference With Jeremy Clark', card_for('bonus-episode').at_css('.episode-card-subject').text
  end

  def test_card_reads_a_minutes_and_seconds_duration
    assert_equal 'EP 0 · 9 min', card_for('episode-000').at_css('.episode-card-meta').text
  end

  def test_card_reads_a_duration_written_with_a_dot
    assert_equal 'EP 3 · 31 min', card_for('episode-003').at_css('.episode-card-meta').text
  end

  def test_every_card_shows_a_running_time
    assert_empty html('episodes.html').css('.episode-card-meta').reject { |meta| meta.text.match?(/· \d+ min\z/) }.map(&:text)
  end

  # --- episode page: what the scripts and guests rely on ------------------------------

  def test_every_episode_page_has_the_audio_element_chapter_seeking_needs
    assert_empty episode_pages.reject { |page| html(page).at_css('audio#episode-audio') }
  end

  def test_every_episode_audio_has_a_source
    assert_empty episode_pages.select { |page| html(page).at_css('audio#episode-audio')&.[]('src').to_s.strip.empty? }
  end

  def test_every_episode_audio_plays_the_episode_link
    assert_empty episode_sources.reject { |episode| html(episode[:page]).at_css('audio#episode-audio')&.[]('src') == episode[:data]['link'] }.map { |episode| episode[:page] }
  end

  # Episode 18 predates the .podcast-chapters wrapper and the bonus episode has no chapters,
  # so what holds is: every numbered episode has timestamps, however they are wrapped.
  def test_every_numbered_episode_page_has_chapter_timestamps
    numbered = episode_sources.select { |episode| episode[:data]['title'].start_with?('Episode ') }
    assert_empty numbered.reject { |episode| html(episode[:page]).at_css('time.chapter-timestamp') }.map { |episode| episode[:page] }
  end

  def test_every_chapter_link_carries_a_timestamp
    assert_empty episode_pages.select { |page| html(page).css('.content a[href="#!"]').any? { |link| link.at_css('time.chapter-timestamp').nil? } }
  end

  def test_every_chapter_timestamp_sits_directly_in_the_link_the_media_player_binds
    assert_empty episode_pages.select { |page| html(page).css('time.chapter-timestamp').any? { |time| time.parent.name != 'a' } }
  end

  def test_no_episode_page_loads_the_twitter_widgets_script
    assert_empty episode_pages.select { |page| html(page).at_css('script[src*="platform.twitter.com"]') }
  end

  def test_no_page_shows_the_tweet_or_follow_button
    assert_empty content_pages.select { |page| html(page).at_css('.twitter-share-button, .twitter-follow-button') }
  end

  def test_every_episode_page_has_the_comment_thread
    assert_empty episode_pages.reject { |page| html(page).at_css('#disqus_thread') }
  end

  def test_every_blog_post_has_the_comment_thread
    assert_empty blog_pages.reject { |page| html(page).at_css('#disqus_thread') }
  end

  def test_guest_twitter_link_is_rendered_on_an_episode_with_a_handle
    assert_equal '@aimee_knight', html(episode_page('episode-452')).at_css('.guest a[href="https://twitter.com/aimee_knight"]')&.text
  end

  def test_guest_twitter_link_is_rendered_on_a_guest_profile
    assert_equal '@housecor', html('CoryHouse.html').at_css('.guest-handle a[href="https://twitter.com/housecor"]')&.text
  end

  def test_no_page_embeds_the_retired_twitter_timeline
    assert_empty content_pages.select { |page| SITE.join(page).read.include?('twitter-timeline') }
  end

  def test_sponsor_copy_renders_its_list_markup
    assert_operator html(episode_page('episode-402')).css('.sponsor-message li').size, :>, 0
  end

  def test_no_sponsor_copy_shows_literal_tags
    assert_empty episode_pages.select { |page| html(page).css('.sponsor-message, .sponsor-title').any? { |copy| copy.text.match?(%r{</?(ul|li|p)>}) } }
  end

  def test_no_episode_carries_a_dailydrip_ad
    assert_empty sponsor_links.grep(/dailydrip/)
  end

  def test_no_episode_carries_a_remote_conference_ad
    assert_empty sponsor_links.grep(/remoteconference/)
  end

  def test_no_page_links_to_the_retired_conference_site
    assert_empty content_pages.select { |page| SITE.join(page).read.include?('remoteconference.developeronfire.com') }
  end

  # DailyDrip's domain looks parked, so these must not send visitors to whoever buys it.
  def test_dailydrip_redirect_page_is_gone
    refute SITE.join('dailydrip.html').exist?
  end

  def test_dd_redirect_page_is_gone
    refute SITE.join('dd.html').exist?
  end

  # --- guest photos and link previews -------------------------------------------------

  def test_no_page_shows_an_original_guest_photo
    assert_empty guest_photo_sources.reject { |_, src| src.start_with?('/assets/images/guests/') }
  end

  def test_every_guest_photo_copy_a_page_shows_exists
    assert_empty guest_photo_sources.reject { |_, src| SITE.join(".#{src}").file? }
  end

  def test_every_wide_card_photo_a_card_offers_exists
    wide = html('episodes.html').css('.episode-card-photos img').flat_map { |img| img['srcset'].to_s.scan(%r{(\S+) 640w}).flatten }
    assert_empty wide.reject { |src| SITE.join(".#{src}").file? }
  end

  def test_every_card_offers_a_wide_copy_for_sharp_screens
    assert_empty html('episodes.html').css('.episode-card-photos img').reject { |img| img['srcset'].to_s.include?(' 640w') }
  end

  def test_every_search_result_photo_exists
    assert_empty search_index.reject { |entry| SITE.join(".#{entry['image']}").file? }.map { |entry| entry['title'] }
  end

  def test_no_guest_photo_copy_weighs_more_than_64_kb
    assert_empty Dir[SOURCE.join('assets/images/guests/*/*.webp').to_s].select { |file| File.size(file) > 64 * 1024 }
  end

  def test_episode_description_is_its_one_line_summary
    assert_equal 'Kyle Welch talks with Dave Rael about saying yes, community involvement, prioritizing family, and work culture',
                 meta(episode_page('episode-388'), 'description')
  end

  def test_episode_preview_uses_its_one_line_summary
    assert_equal meta(episode_page('episode-388'), 'description'), meta(episode_page('episode-388'), 'og:description')
  end

  def test_episode_without_a_summary_falls_back_to_its_subtitle
    assert_equal 'Developer On Fire: John Sonmez', meta(episode_page('episode-001'), 'og:description')
  end

  def test_episode_preview_shows_the_guest_photo
    assert_equal 'https://developeronfire.com/assets/images/KyleWelch.jpg', meta(episode_page('episode-388'), 'og:image')
  end

  def test_preview_photo_names_with_spaces_are_escaped
    assert_equal 'https://developeronfire.com/assets/images/David%20DeWolf.jpg', meta(episode_page('episode-380'), 'og:image')
  end

  def test_every_preview_photo_exists
    missing = content_pages.reject do |page|
      SITE.join(".#{URI.decode_uri_component(meta(page, 'og:image').to_s.delete_prefix('https://developeronfire.com'))}").file?
    end
    assert_empty missing
  end

  def test_every_page_has_a_preview_title
    assert_empty content_pages.select { |page| meta(page, 'og:title').to_s.strip.empty? }
  end

  def test_every_preview_links_to_the_live_site
    assert_empty content_pages.reject { |page| meta(page, 'og:url').to_s.start_with?('https://developeronfire.com/') }
  end

  def test_every_page_asks_for_a_summary_card
    assert_empty content_pages.reject { |page| meta(page, 'twitter:card') == 'summary' }
  end

  # --- site shell ---------------------------------------------------------------------

  def test_every_page_has_a_skip_link
    assert_empty content_pages.reject { |page| html(page).at_css('a.skip-link[href^="#"]') }
  end

  def test_every_skip_link_target_exists
    missing = content_pages.reject do |page|
      document = html(page)
      link = document.at_css('a.skip-link[href^="#"]')
      link && document.at_css(link['href'])
    end
    assert_empty missing
  end

  def test_every_page_has_exactly_one_h1
    assert_empty content_pages.reject { |page| html(page).css('h1').size == 1 }
  end

  def test_every_page_offers_the_agreed_main_navigation
    assert_empty content_pages.reject { |page| html(page).css('.site-nav a').map(&:text) == MAIN_NAVIGATION }
  end

  def test_every_page_has_a_menu_button_that_starts_collapsed
    assert_empty content_pages.reject { |page| html(page).at_css('button.menu-toggle')&.[]('aria-expanded') == 'false' }
  end

  def test_every_menu_button_controls_an_element_that_exists
    missing = content_pages.reject do |page|
      document = html(page)
      target = document.at_css('button.menu-toggle')&.[]('aria-controls').to_s
      !target.empty? && document.at_css("##{target}")
    end
    assert_empty missing
  end

  # The menu collapses only once site-menu.js says it can work, so it must run before first
  # paint, and nothing else may claim scripting works before it has actually loaded.
  def test_every_page_loads_the_menu_script_in_the_head
    assert_empty content_pages.reject { |page| html(page).at_css(%(head script[src="#{SCRIPTS}/site-menu.js"])) }
  end

  def test_no_page_marks_itself_scripted_inline
    assert_empty content_pages.select { |page| html(page).css('script:not([src])').any? { |script| script.text.match?(/className|classList/) } }
  end

  def test_every_page_loads_trackjs_without_blocking_rendering
    assert_empty content_pages.reject { |page| html(page).at_css('script[src*="cdn.trackjs.com"][async]') }
  end

  def test_every_page_sets_the_trackjs_config_before_the_agent
    missing = content_pages.reject do |page|
      scripts = html(page).css('script')
      config = scripts.find_index { |script| script.text.include?('window._trackJs') }
      agent = scripts.find_index { |script| script['src'].to_s.include?('cdn.trackjs.com') }
      config && agent && config < agent
    end
    assert_empty missing
  end

  def test_every_page_loads_the_search_script
    assert_empty content_pages.reject { |page| html(page).at_css(%(script[src="#{SCRIPTS}/search.js"])) }
  end

  def test_every_episode_page_loads_the_media_player_script
    assert_empty episode_pages.reject { |page| html(page).at_css(%(script[src="#{SCRIPTS}/mediaPlayer.js"])) }
  end

  def test_book_recommendations_page_loads_its_script
    assert html('book-recommendations.html').at_css(%(script[src="#{SCRIPTS}/book-recommendations.js"]))
  end

  def test_book_recommendations_page_explains_itself_without_scripts
    assert_includes html('book-recommendations.html').css('noscript').text, 'JavaScript'
  end

  def test_book_recommendations_page_has_the_list_its_script_fills
    assert html('book-recommendations.html').at_css('ul#book-recommendations')
  end

  def test_every_page_has_the_search_box_search_js_needs
    assert_empty content_pages.reject { |page| html(page).at_css('input#search') }
  end

  def test_search_box_refuses_text_longer_than_any_episode_title
    assert_equal search_index.map { |entry| entry['title'].length }.max, html('index.html').at_css('input#search')['maxlength'].to_i
  end

  def test_search_stays_hidden_until_the_script_is_ready
    assert_match(/^\.site-search \{[^}]*display: none/, stylesheet)
  end

  def test_narrow_layout_reveals_search_with_the_class_the_script_sets
    assert_includes stylesheet, ".#{search_ready_class} .site-search { display: block; }"
  end

  def test_desktop_layout_holds_the_search_box_space_until_ready
    assert_match(/^\s+\.site-search \{[^}]*visibility: hidden/, stylesheet)
  end

  def test_desktop_layout_reveals_search_with_the_class_the_script_sets
    assert_includes stylesheet, ".#{search_ready_class} .site-search { visibility: visible; }"
  end

  def test_forced_colours_keep_the_selected_result_visible
    assert_match(/@media \(forced-colors: active\).*\.search-result li\.selected \{ outline:/m, stylesheet)
  end

  def test_every_page_has_the_search_result_container_search_js_needs
    assert_empty content_pages.reject { |page| html(page).at_css('.search-result-container') }
  end

  def test_search_result_list_is_inside_the_container_search_js_looks_in
    assert_empty content_pages.reject { |page| html(page).at_css('.search-result-container .search-result') }
  end

  def test_sitemap_does_not_list_the_not_found_page
    assert_empty SITE.join('sitemap.txt').read.lines.map(&:strip).select { |url| url.end_with?('developeronfire.com/404') }
  end

  # --- assets -------------------------------------------------------------------------

  def test_no_page_loads_bootstrap_or_jquery_assets
    offenders = content_pages.flat_map do |page|
      html(page).css('link[href], script[src]').map { |node| node['href'] || node['src'] }
                .select { |ref| ref.match?(/bootstrap|jquery/i) }.map { |ref| "#{page}: #{ref}" }
    end
    assert_empty offenders
  end

  def test_no_page_references_google_fonts
    assert_empty content_pages.select { |page| SITE.join(page).read.match?(/fonts\.(googleapis|gstatic)\.com/) }
  end

  def test_stylesheet_does_not_reference_google_fonts
    refute_match(/fonts\.(googleapis|gstatic)\.com/, stylesheet)
  end

  def test_stylesheet_declares_both_font_families
    assert_equal ['Inter', 'Space Grotesk'], stylesheet.scan(/@font-face\s*\{[^}]*font-family:\s*"([^"]+)"/).flatten.uniq.sort
  end

  def test_every_font_face_declares_font_display_swap
    assert_empty stylesheet.scan(/@font-face\s*\{[^}]*\}/).reject { |rule| rule.include?('font-display: swap') }
  end

  def test_every_font_face_url_resolves
    urls = stylesheet.scan(/@font-face\s*\{[^}]*\}/).flat_map { |rule| rule.scan(/url\("([^"]+)"\)/).flatten }
    assert_empty urls.reject { |url| SITE.join('assets/themes/on-fire/css').join(url).file? }
  end

  def test_every_font_file_is_not_empty
    assert_empty FONT_FILES.keys.reject { |name| font_path(name).file? && font_path(name).size.positive? }
  end

  def test_font_files_are_the_fontsource_5_3_0_releases
    assert_empty FONT_FILES.reject { |name, sha256| font_path(name).file? && Digest::SHA256.file(font_path(name)).hexdigest == sha256 }.keys
  end

  def test_font_licences_are_published_with_the_fonts
    assert_equal %w[OFL-Inter.txt OFL-SpaceGrotesk.txt], Dir.glob(SITE.join('assets/themes/on-fire/fonts/OFL-*.txt')).map { |path| File.basename(path) }.sort
  end

  def test_legacy_theme_logo_stays_at_the_url_a_blog_post_links_to
    assert SITE.join(LEGACY_THEME_LOGO).file?
  end

  # Guest and card photos must be self-hosted: a remote one could not be checked offline,
  # so it fails here rather than passing unchecked. Images written into post and page
  # bodies are content and may be remote (see test_internal_links_from_layouts_resolve).
  def test_guest_and_card_images_are_self_hosted
    remote = content_pages.flat_map do |page|
      html(page).css('img.guest, .episode-card img').map { |img| img['src'].to_s }.select { |src| remote?(src) }.map { |src| "#{page}: #{src}" }
    end
    assert_empty remote.uniq
  end

  # Covers absolute and relative paths; a blank src counts as broken.
  def test_local_images_from_layouts_resolve
    missing = content_pages.flat_map do |page|
      html(page).xpath('//img[not(ancestor::div[@class="content"])]').map { |img| img['src'].to_s }
                .select { |src| local?(src) }.reject { |src| resolves?(src, page) }.map { |src| "#{page}: #{src}" }
    end
    assert_empty missing.uniq
  end

  private

  def front_matter_of(path)
    text = File.read(path)
    front_matter = text[/\A---\n(.*?)\n---\n/m, 1]
    raise "#{path} has no front matter (is the file LF-terminated?)" unless front_matter
    YAML.safe_load(front_matter)
  end

  def body_of(path)
    File.read(path).sub(/\A---\n.*?\n---\n/m, '')
  end

  def episodes
    @episodes ||= Dir.glob(SOURCE.join('Podcast/_posts/*')).sort.map { |path| front_matter_of(path) }
  end

  # Every guest entry there is, on episodes and on guest pages.
  def all_guests
    episodes.flat_map { |episode| episode.fetch('guests', []) } + guest_pages.values.flatten
  end

  def guest_pages
    @guest_pages ||= Dir.glob(SOURCE.join('*.md')).each_with_object({}) do |path, pages|
      next unless File.read(path).start_with?("---\n")
      data = front_matter_of(path)
      case data['layout']
      when 'guest' then pages[File.basename(path, '.md')] = [data['guest']]
      when 'guest-disambiguation' then pages[File.basename(path, '.md')] = data['guests']
      end
    end
  end

  def search_index
    @search_index ||= JSON.parse(SITE.join('search.json').read)
  end

  def book_recommendations
    @book_recommendations ||= JSON.parse(SITE.join('book-recommendations.json').read)
  end

  def html(page)
    self.class.parsed[page] ||= Nokogiri::HTML(SITE.join(page).read)
  end

  def self.parsed
    @parsed ||= {}
  end

  def xml(page)
    Nokogiri::XML(SITE.join(page).read)
  end

  def rendered_pages(glob)
    Dir.glob(SITE.join(glob)).map { |path| Pathname.new(path).relative_path_from(SITE).to_s }
  end

  # Every rendered page a visitor can land on, as distinct from redirect stubs.
  def content_pages
    self.class.content_pages
  end

  def self.content_pages
    @content_pages ||= Dir.glob(SITE.join('**/*.html'))
                          .reject { |path| File.read(path).match?(/http-equiv=["']?refresh/i) }
                          .map { |path| Pathname.new(path).relative_path_from(SITE).to_s }
  end

  # A page's visible text, with the curly quotes the Markdown renderer adds undone.
  def main_text(page)
    html(page).at_css('main').text.tr('’', "'").gsub(/\s+/, ' ')
  end

  def sponsor_links
    episode_pages.flat_map { |page| html(page).css('a.sponsor').map { |ad| ad['href'] } }
  end

  def stylesheet
    SITE.join('assets/themes/on-fire/css/style.css').read
  end

  def search_ready_class
    SITE.join('assets/themes/on-fire/scripts/search.js').read[/documentElement\.classList\.add\('([\w-]+)'\)/, 1]
  end

  # Every guest photo the layouts show, as [page, src]: episode cards, guest cards and
  # profiles. Photos written into page bodies are content and keep their originals.
  def guest_photo_sources
    content_pages.flat_map { |page| html(page).css('.guest-card img.guest, .guest-profile img.guest, .episode-card-photos img').map { |img| [page, img['src']] } }
  end

  # A meta tag's content, by name or property.
  def meta(page, key)
    html(page).at_css(%(meta[name="#{key}"], meta[property="#{key}"]))&.[]('content')
  end

  def card_links(page)
    html(page).css('.episode-card a').map { |a| a['href'] }
  end

  def card_for(episode)
    url = episode_url(episode)
    self.class.archive.css('.episode-card').find { |card| card.at_css('a')['href'] == url } or raise "no card for #{episode}"
  end

  def self.archive
    @archive ||= Nokogiri::HTML(SITE.join('episodes.html').read)
  end

  # Pages whose markup comes from the layouts under test (episodes, blog posts, guest pages, home).
  def layout_pages
    ['index.html'] + rendered_pages('podcast/*.html') + rendered_pages('blog/*.html') + guest_pages.keys.map { |page| "#{page}.html" }
  end

  # Episode and blog sources, newest first, in the order Jekyll sorts them. Front matter
  # has no date key: as for Jekyll, a post's date is the one in its file name. The page
  # lists come from here, not from the output, so a change to the markup cannot empty them.
  def episode_sources
    self.class.sources('Podcast', 'podcast')
  end

  def blog_sources
    self.class.sources('Blog', 'blog')
  end

  def self.sources(directory, category)
    @sources ||= {}
    @sources[directory] ||= Dir.glob(SOURCE.join(directory, '_posts/*')).sort.reverse.map do |path|
      name = File.basename(path, '.*')
      slug = Jekyll::Utils.slugify(name[11..], mode: 'pretty', cased: true)
      text = File.read(path)
      { year: name[0, 4], url: "/#{category}/#{slug}", page: "#{category}/#{slug}.html", data: YAML.safe_load(text[/\A---\n(.*?)\n---\n/m, 1]) }
    end
  end

  def episode_pages
    episode_sources.map { |episode| episode[:page] }
  end

  def blog_pages
    blog_sources.map { |post| post[:page] }
  end

  def episode_urls_by_year
    episode_sources.group_by { |episode| episode[:year] }.transform_values { |group| group.map { |episode| episode[:url] } }
  end

  def archive_urls_by_year
    self.class.archive.css('.archive-year').to_h { |year| [year.at_css('h2').text, year.css('.episode-card a').map { |a| a['href'] }] }
  end

  def font_path(name)
    SITE.join('assets/themes/on-fire/fonts', name)
  end

  def episode_page(episode)
    rendered_pages("podcast/#{episode}*.html").first or raise "no rendered page for #{episode}"
  end

  def episode_url(episode)
    "/#{episode_page(episode).delete_suffix('.html')}"
  end

  def navigation_links_leaving(category)
    rendered_pages("#{category}/*.html").flat_map do |page|
      html(page).css('ul.pagination li.prev a[href], ul.pagination li.next a[href]')
                .map { |a| a['href'] }
                .reject { |href| href.start_with?("/#{category}/") }
                .map { |href| "#{page}: #{href}" }
    end
  end

  def remote?(reference)
    reference.match?(%r{\A([a-z][a-z0-9+.-]*:|//)}i)
  end

  # Anything served from this site, whether written absolute or relative. Links to a
  # place on the same page are not file references.
  def local?(reference)
    !remote?(reference) && !reference.start_with?('#')
  end

  def host_of(reference)
    URI(reference).host
  rescue URI::InvalidURIError
    "(unparseable: #{reference})"
  end

  def resolves?(href, page)
    return false if href.strip.empty?

    path = URI.decode_uri_component(href.split(/[#?]/).first.to_s).chomp('/')
    path = File.join('/', File.dirname(page), path) unless path.empty? || path.start_with?('/')
    path = '/index' if path.empty?
    [SITE.join(".#{path}"), SITE.join(".#{path}.html"), SITE.join(".#{path}/index.html")].any? { |candidate| candidate.file? }
  end
end
