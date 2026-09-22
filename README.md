# Developer On Fire website

This is the website for the podcast [Developer On Fire](https://developeronfire.com).
It is a [Jekyll](https://jekyllrb.com) site published by GitHub Pages from the
`master` branch.

## Content

- Podcast episodes live in `Podcast/_posts`. Each episode's front matter carries
  the audio `link`, `length` and `duration`, a `guests` list (name, image, blog,
  twitter), `book_recommendations` and any `sponsors`.
- Blog posts live in `Blog/_posts`.
- Guest pages (`CoryHouse.md` and friends) use the `guest` layout and list a
  guest's episodes and blog posts by matching on the guest's name.
- Layouts are thin wrappers in `_layouts`; the markup is in
  `_includes/themes/bootstrap-3`.

## Building locally

GitHub Pages builds with the `github-pages` gem on the Ruby version in
`.ruby-version`. With that Ruby installed (rbenv, rvm, asdf and mise all read the
file):

```sh
bundle install
bundle exec jekyll serve
```

Without a local Ruby, Docker gives the same toolchain:

```sh
docker run --rm -it -p 4000:4000 -v "$PWD":/site -w /site \
  -e BUNDLE_PATH=/site/vendor/bundle ruby:3.3.4 \
  bash -c "bundle install && bundle exec jekyll serve --host 0.0.0.0"
```

## Tests

```sh
bin/test
```

This builds the site, runs the checks in `test/site_test.rb` against the rendered
output, runs the script tests in `test/js` with `node --test`, and audits the
dependency set with bundler-audit. The same script runs in GitHub Actions on
every push and pull request. Node 22 or newer is required for the script tests.
