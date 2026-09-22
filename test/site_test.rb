# Checks against the rendered site (_site) and the episode sources.
# Run via bin/test, which builds the site first. SITE_DIR overrides the
# rendered location.
require 'minitest/autorun'
require 'json'
require 'yaml'
require 'nokogiri'
require 'pathname'
require 'uri'

class SiteTest < Minitest::Test
  SOURCE = Pathname.new(File.expand_path('..', __dir__))
  SITE = Pathname.new(ENV.fetch('SITE_DIR', SOURCE.join('_site').to_s))
  KNOWN_SCRIPT_HOSTS = %w[cdn.trackjs.com platform.twitter.com www.googletagmanager.com].freeze

  def setup
    assert SITE.join('index.html').exist?, "no rendered site at #{SITE}; run bin/test"
  end

  # --- episode sources -------------------------------------------------------

  def test_every_episode_declares_at_least_one_guest_with_name_and_image
    without_guest = episodes.reject do |episode|
      guests = episode.fetch('guests', [])
      !guests.empty? && guests.all? { |guest| guest['name'].to_s != '' && guest['image'].to_s != '' }
    end
    assert_empty without_guest.map { |episode| episode['title'] }
  end

  def test_no_episode_uses_the_retired_flat_guest_fields
    legacy = episodes.select { |episode| episode.keys.intersect?(%w[guest_name guest_blog guest_twitter]) }
    assert_empty legacy.map { |episode| episode['title'] }
  end

  # --- search and book endpoints ---------------------------------------------

  def test_search_index_lists_every_episode
    assert_equal episodes.size, JSON.parse(SITE.join('search.json').read).size
  end

  def test_every_search_index_entry_has_title_url_and_image
    incomplete = JSON.parse(SITE.join('search.json').read).reject do |entry|
      %w[title url image].all? { |key| entry[key].to_s != '' }
    end
    assert_empty incomplete
  end

  def test_every_book_recommendation_names_the_recommending_episode
    incomplete = JSON.parse(SITE.join('book-recommendations.json').read).reject do |entry|
      entry['title'].to_s != '' && entry.dig('recommended_by', 'url').to_s.start_with?('/podcast/')
    end
    assert_empty incomplete
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

  # --- navigation ----------------------------------------------------------------

  def test_blog_post_navigation_stays_within_the_blog
    assert_empty navigation_links_leaving('blog')
  end

  def test_episode_navigation_stays_within_the_podcast
    assert_empty navigation_links_leaving('podcast')
  end

  # --- guest pages ---------------------------------------------------------------

  def test_guest_pages_list_every_episode_the_guest_appears_in
    mismatches = guest_pages.flat_map do |page, guests|
      rendered = html("#{page}.html")
      guests.zip(rendered.css('ul.appearances')).filter_map do |guest, list|
        expected = episodes.count { |episode| episode.fetch('guests', []).any? { |g| g['name'] == guest['name'] } }
        listed = list ? list.css('li').size : 0
        "#{guest['name']}: expected #{expected}, listed #{listed}" if expected != listed
      end
    end
    assert_empty mismatches
  end

  # --- markup hygiene ------------------------------------------------------------

  def test_layout_links_that_open_a_new_tab_use_noopener
    unsafe = rendered_pages('podcast/*.html').flat_map do |page|
      html(page).xpath('//a[@target="_blank"][not(ancestor::div[@class="content"])]')
                .reject { |a| a['rel'].to_s.split.include?('noopener') }
                .map { |a| "#{page}: #{a['href']}" }
    end
    assert_empty unsafe
  end

  def test_guest_images_have_alt_text
    missing = (['index.html'] + rendered_pages('podcast/*.html') + guest_pages.keys.map { |p| "#{p}.html" }).flat_map do |page|
      html(page).css('img.guest').select { |img| img['alt'].to_s.strip.empty? }.map { |img| "#{page}: #{img['src']}" }
    end
    assert_empty missing
  end

  def test_scripts_load_only_from_this_origin_or_known_services
    foreign = rendered_pages('**/*.html').flat_map do |page|
      html(page).css('script[src]').map { |s| s['src'] }.reject do |src|
        src.start_with?('/') && !src.start_with?('//') || KNOWN_SCRIPT_HOSTS.include?(URI(src).host)
      end
    end
    assert_empty foreign.uniq
  end

  def test_homepage_audio_players_do_not_preload
    assert_equal ['none'], html('index.html').css('audio').map { |audio| audio['preload'] }.uniq
  end

  def test_no_page_embeds_the_retired_mailing_list_form
    assert_empty rendered_pages('**/*.html').select { |page| SITE.join(page).read.include?('mc_embed_signup') }
  end

  def test_internal_links_from_layouts_resolve
    broken = (['index.html', 'episodes.html', 'blog.html'] + guest_pages.keys.map { |p| "#{p}.html" } + rendered_pages('podcast/*.html').first(25)).flat_map do |page|
      html(page).xpath('//a[@href][not(ancestor::div[@class="content"])]').map { |a| a['href'] }
                .select { |href| href.start_with?('/') && !href.start_with?('//') }
                .reject { |href| resolves?(href) }
                .map { |href| "#{page}: #{href}" }
    end
    assert_empty broken
  end

  private

  def episodes
    @episodes ||= Dir.glob(SOURCE.join('Podcast/_posts/*')).sort.map do |path|
      front_matter = File.read(path)[/\A---\n(.*?)\n---\n/m, 1]
      YAML.safe_load(front_matter)
    end
  end

  def guest_pages
    @guest_pages ||= Dir.glob(SOURCE.join('*.md')).each_with_object({}) do |path, pages|
      front_matter = File.read(path)[/\A---\n(.*?)\n---\n/m, 1]
      next unless front_matter
      data = YAML.safe_load(front_matter)
      case data['layout']
      when 'guest' then pages[File.basename(path, '.md')] = [data['guest']]
      when 'guest-disambiguation' then pages[File.basename(path, '.md')] = data['guests']
      end
    end
  end

  def html(page)
    Nokogiri::HTML(SITE.join(page).read)
  end

  def xml(page)
    Nokogiri::XML(SITE.join(page).read)
  end

  def rendered_pages(glob)
    Dir.glob(SITE.join(glob)).map { |path| Pathname.new(path).relative_path_from(SITE).to_s }
  end

  def navigation_links_leaving(category)
    rendered_pages("#{category}/*.html").flat_map do |page|
      html(page).css('ul.pagination li.prev a[href], ul.pagination li.next a[href]')
                .map { |a| a['href'] }
                .reject { |href| href.start_with?("/#{category}/") }
                .map { |href| "#{page}: #{href}" }
    end
  end

  def resolves?(href)
    path = href.split(/[#?]/).first.to_s.chomp('/')
    path = '/index' if path.empty?
    [SITE.join(".#{path}"), SITE.join(".#{path}.html"), SITE.join(".#{path}/index.html")].any? { |candidate| candidate.file? }
  end
end
