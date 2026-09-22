# Checks against the rendered site (_site) and the episode sources.
# Run via bin/test, which builds the site first. SITE_DIR overrides the
# rendered location.
require 'minitest/autorun'
require 'json'
require 'yaml'
require 'digest'
require 'nokogiri'
require 'pathname'
require 'uri'

class SiteTest < Minitest::Test
  SOURCE = Pathname.new(File.expand_path('..', __dir__))
  SITE = Pathname.new(ENV.fetch('SITE_DIR', SOURCE.join('_site').to_s))

  # Hosts the site knowingly loads scripts from. Disqus injects its embed
  # script at runtime and so never appears as a script[src] in the markup.
  KNOWN_SCRIPT_HOSTS = %w[cdn.trackjs.com platform.twitter.com www.googletagmanager.com].freeze

  # Self-hosted third-party libraries, pinned to the digests of the official releases
  # (jQuery 3.7.1, Bootstrap 3.4.1) so an edit or bad merge cannot change them unnoticed.
  VENDORED_LIBRARIES = {
    'assets/themes/bootstrap-3/bootstrap/js/jquery.min.js' => 'fc9a93dd241f6b045cbff0481cf4e1901becd0e12fb45166a8f17f95823f0b1a',
    'assets/themes/bootstrap-3/bootstrap/js/bootstrap.min.js' => '9ee2fcff6709e4d0d24b09ca0fc56aade12b4961ed9c43fd13b03248bfb57afe',
    'assets/themes/bootstrap-3/bootstrap/css/bootstrap.min.css' => '6d92dfc1700fd38cd130ad818e23bc8aef697f815b2ea5face2b5dfad22f2e11',
    'assets/themes/bootstrap-3/bootstrap/css/bootstrap-theme.min.css' => 'f2e1cc227d6bbb4192e4a3becdfed971c7fc530d76200e43add11c98cb962c53'
  }.freeze

  def setup
    assert SITE.join('index.html').exist?, "no rendered site at #{SITE}; run bin/test"
  end

  # --- episode sources -------------------------------------------------------

  def test_every_episode_declares_at_least_one_guest
    assert_empty episodes.select { |episode| episode.fetch('guests', []).empty? }.map { |episode| episode['title'] }
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

  def test_analytics_tag_is_rendered_on_episode_pages
    assert_equal 1, html(episode_page('episode-452')).css('script[src^="https://www.googletagmanager.com/gtag/js"]').size
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
                .select { |ref| local?(ref) }.reject { |ref| resolves?(ref) }.map { |ref| "#{page}: #{ref}" }
    end
    assert_empty missing.uniq
  end

  def test_vendored_libraries_are_the_official_releases
    altered = VENDORED_LIBRARIES.reject { |path, sha256| Digest::SHA256.file(SOURCE.join(path)).hexdigest == sha256 }
    assert_empty altered.keys
  end

  def test_homepage_audio_players_do_not_preload
    assert_equal ['none'], html('index.html').css('audio').map { |audio| audio['preload'] }.uniq
  end

  def test_no_page_embeds_the_retired_mailing_list_form
    assert_empty rendered_pages('**/*.html').select { |page| SITE.join(page).read.include?('mc_embed_signup') }
  end

  # Links written into post bodies are content and may rot (several 2014 blog posts
  # link to images that were never migrated); links the layouts emit must not.
  def test_internal_links_from_layouts_resolve
    broken = rendered_pages('**/*.html').flat_map do |page|
      html(page).xpath('//a[@href][not(ancestor::div[@class="content"])]').map { |a| a['href'] }
                .select { |href| local?(href) }.reject { |href| resolves?(href) }.map { |href| "#{page}: #{href}" }
    end
    assert_empty broken
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
    Nokogiri::HTML(SITE.join(page).read)
  end

  def xml(page)
    Nokogiri::XML(SITE.join(page).read)
  end

  def rendered_pages(glob)
    Dir.glob(SITE.join(glob)).map { |path| Pathname.new(path).relative_path_from(SITE).to_s }
  end

  # Pages whose markup comes from the layouts under test (episodes, blog posts, guest pages, home).
  def layout_pages
    ['index.html'] + rendered_pages('podcast/*.html') + rendered_pages('blog/*.html') + guest_pages.keys.map { |page| "#{page}.html" }
  end

  # Rendered episode pages, as distinct from the redirect stubs that share the podcast/ directory.
  def episode_pages
    @episode_pages ||= rendered_pages('podcast/*.html').select { |page| html(page).at_css('div.post-full') }
  end

  def episode_page(episode)
    rendered_pages("podcast/#{episode}-*.html").first or raise "no rendered page for #{episode}"
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

  def local?(reference)
    reference.start_with?('/') && !reference.start_with?('//')
  end

  def host_of(reference)
    URI(reference).host
  rescue URI::InvalidURIError
    "(unparseable: #{reference})"
  end

  def resolves?(href)
    path = href.split(/[#?]/).first.to_s.chomp('/')
    path = '/index' if path.empty?
    [SITE.join(".#{path}"), SITE.join(".#{path}.html"), SITE.join(".#{path}/index.html")].any? { |candidate| candidate.file? }
  end
end
