defmodule Rock.AboutPage do
  use Tableau.Page,
    layout: Rock.RootLayout,
    permalink: "/about",
    title: "About Me"

  import Rock

  def template(assigns) do
    ~H"""
    <article>
      <h1>About Me</h1>

      <p>
        Hi, I'm Rock — a software engineer based in Madrid, Spain.
      </p>

      <p>
        I work mostly in functional and systems languages. Currently spending a lot of time with
        Elixir, Scala, and Rust, though I've always got a side project going in something new.
      </p>

      <p>
        You can find me on:
      </p>

      <ul>
        <li><a href="https://github.com/rockneurotiko">GitHub</a></li>
        <li><a href="https://telegram.me/rockneurotiko">Telegram</a></li>
      </ul>
    </article>
    """
  end
end
