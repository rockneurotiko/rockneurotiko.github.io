defmodule Rock.AboutPage do
  use Tableau.Page,
    layout: Rock.RootLayout,
    permalink: "/about",
    title: "About Me"

  import Rock

  def template(assigns) do
    ~H"""
    <div class="bg-indigo-700 text-white">
      <div class="max-w-5xl mx-auto px-6 py-14">
        <h1 class="text-4xl font-extrabold tracking-tight">About Me</h1>
      </div>
    </div>
    <div class="max-w-3xl mx-auto px-6 py-12">
      <div class="prose-mag">
        <p>Hi! I'm Rock Neurotiko, a software engineer based in Madrid.</p>
        <p>I work with Elixir, Scala, Rust, and other tools. This blog is where I share things I've learned and built.</p>
        <p>You can find me at:</p>
        <ul>
          <li><a href="https://github.com/rockneurotiko">GitHub — rockneurotiko</a></li>
          <li><a href="https://telegram.me/rockneurotiko">Telegram — rockneurotiko</a></li>
        </ul>
      </div>
    </div>
    """
  end
end
