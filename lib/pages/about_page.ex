defmodule Rock.AboutPage do
  use Tableau.Page,
    layout: Rock.RootLayout,
    permalink: "/about",
    title: "About Me"

  import Rock

  def template(assigns) do
    ~H"""
    <article>
      <h1 class="text-3xl font-bold text-stone-900 mb-8 border-l-4 border-teal-400 pl-4" style="letter-spacing: -0.015em;">About Me</h1>
      <div class="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm prose-notebook">
        <p>Hi! I'm Rock Neurotiko, a software engineer based in Madrid.</p>
        <p>I work with Elixir, Scala, Rust, and other tools. This blog is where I share things I've learned and built.</p>
        <p>You can find me at:</p>
        <ul>
          <li><a href="https://github.com/rockneurotiko">GitHub — rockneurotiko</a></li>
          <li><a href="https://telegram.me/rockneurotiko">Telegram — rockneurotiko</a></li>
        </ul>
      </div>
    </article>
    """
  end
end
