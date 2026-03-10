defmodule Rock.AboutPage do
  use Tableau.Page,
    layout: Rock.RootLayout,
    permalink: "/about",
    title: "About Me"

  import Rock

  def template(assigns) do
    ~H"""
    <article>
      <div class="text-xs text-[#166534] mb-4">$ cat about.md</div>
      <h1 class="text-2xl font-bold text-[#4ade80] mb-8" style="text-shadow: 0 0 20px rgba(74,222,128,0.3);">&gt; About Me</h1>
      <div class="prose-terminal">
        <p>Hi! I'm Rock Neurotiko, a software engineer based in Madrid.</p>
        <p>I work with Elixir, Scala, Rust, and other tools. This blog is where I share things I've learned and built.</p>
        <p>You can find me at:</p>
        <ul>
          <li><a href="https://github.com/rockneurotiko">github.com/rockneurotiko</a></li>
          <li><a href="https://telegram.me/rockneurotiko">telegram.me/rockneurotiko</a></li>
        </ul>
      </div>
    </article>
    """
  end
end
