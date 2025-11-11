source "https://rubygems.org"

gem "jekyll", "~> 4.3"
gem "jekyll-feed", "~> 0.17"
gem "jekyll-sitemap", "~> 1.4"

# Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem
# and associated library.
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Performance-booster for watching directories on Windows
gem "wdm", "~> 0.1.1", :platforms => [:mingw, :x64_mingw, :mswin]

# Lock `http_parser.rb` gem to `v0.6.x` on JRuby builds since newer versions of the gem
# do not have a Java counterpart.
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]

# macOS에서는 사용자 설치 경로 사용
if RUBY_PLATFORM =~ /darwin/
  ENV['GEM_HOME'] = File.expand_path('~/.gem/ruby/2.6.0')
  ENV['PATH'] = "#{ENV['GEM_HOME']}/bin:#{ENV['PATH']}"
end

