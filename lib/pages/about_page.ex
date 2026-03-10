defmodule Rock.AboutPage do
  use Tableau.Page, layout: Rock.RootLayout, permalink: "/about", title: "About Me"
  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-2xl mx-auto px-6 py-12">
      <h1 class="text-2xl font-semibold text-gray-900 mb-8">About Me</h1>
      <div class="space-y-4 text-gray-700 leading-relaxed">
        <p>
          I'm a software engineer based in Madrid. I work with Elixir, Scala, and Rust — among other things.
        </p>
        <p>
          This is my corner of the internet where I write about programming, bots, and whatever else I find interesting.
        </p>
      </div>
      <ul class="mt-8 flex gap-6 text-sm">
        <li>
          <a href="https://github.com/rockneurotiko" class="text-gray-500 hover:text-gray-900 transition-colors">github</a>
        </li>
        <li>
          <a href="https://telegram.me/rockneurotiko" class="text-gray-500 hover:text-gray-900 transition-colors">telegram</a>
        </li>
      </ul>
    </article>
    """
  end
end
