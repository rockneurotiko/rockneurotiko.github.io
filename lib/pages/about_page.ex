defmodule Rock.AboutPage do
  use Tableau.Page, layout: Rock.RootLayout, permalink: "/about", title: "About Me"
  import Rock

  def template(assigns) do
    ~H"""
    <div class="bg-indigo-700 text-white">
      <div class="max-w-4xl mx-auto px-6 py-12">
        <h1 class="text-4xl font-extrabold">About Me</h1>
      </div>
    </div>
    <article class="max-w-4xl mx-auto px-6 py-12">
      <div class="max-w-2xl space-y-4 text-gray-700 leading-relaxed text-lg">
        <p>
          I'm a software engineer based in <strong class="text-gray-900 font-semibold">Madrid</strong>. I work with Elixir, Scala, and Rust — among other things.
        </p>
        <p>
          This is my corner of the internet where I write about programming, bots, and whatever else I find interesting.
        </p>
      </div>
      <div class="mt-10 flex gap-4">
        <a href="https://github.com/rockneurotiko" class="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">
          GitHub
        </a>
        <a href="https://telegram.me/rockneurotiko" class="inline-flex items-center gap-2 border border-indigo-300 text-indigo-700 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-indigo-50 transition-colors">
          Telegram
        </a>
      </div>
    </article>
    """
  end
end
