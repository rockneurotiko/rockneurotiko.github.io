import Config

config :tableau, :reloader,
  patterns: [
    ~r"^lib/.*.ex",
    ~r"^(_posts|_pages)/.*.md",
    ~r"^extra/.*.(css|js)"
  ]

config :web_dev_utils, :reload_log, true
# uncomment this if you use something like ngrok
# config :web_dev_utils, :reload_url, "'wss://' + location.host + '/ws'"

config :tableau, :assets, []

config :tableau, :config,
  url: "http://localhost:4999",
  markdown: [
    mdex: [
      extension: [
        table: true,
        header_ids: "",
        tasklist: true,
        strikethrough: true,
        autolink: true,
        alerts: true,
        footnotes: true
      ],
      render: [unsafe: true],
      syntax_highlight: [formatter: {:html_inline, theme: "neovim_dark"}]
    ]
  ]

config :tableau, Tableau.PageExtension, enabled: true
config :tableau, Tableau.PostExtension, enabled: true
config :tableau, Tableau.DataExtension, enabled: true
config :tableau, Tableau.SitemapExtension, enabled: true

config :tableau, Tableau.RSSExtension,
  enabled: true,
  title: "Rock Neurotiko",
  description: "Rock Neurotiko's blog"

config :elixir, :time_zone_database, Tz.TimeZoneDatabase

import_config "#{Mix.env()}.exs"
