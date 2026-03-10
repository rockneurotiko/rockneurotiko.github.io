defmodule Rock.AboutPage do
  use Tableau.Page, layout: Rock.RootLayout, permalink: "/about", title: "About Me"
  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-3xl mx-auto px-6 py-10">
      <div class="text-xs text-emerald-700 mb-6">
        <span class="text-emerald-600">$</span> cat <span class="text-amber-400">about.txt</span>
      </div>
      <h1 class="text-2xl font-bold text-emerald-200 mb-8">&gt; about me</h1>
      <div class="space-y-4 text-emerald-400 leading-relaxed">
        <p>
          <span class="text-emerald-700 mr-2">&gt;&gt;</span>
          Software engineer based in Madrid. Working with Elixir, Scala, and Rust.
        </p>
        <p>
          <span class="text-emerald-700 mr-2">&gt;&gt;</span>
          This is my corner of the internet. I write about programming, bots, and whatever else I find interesting.
        </p>
      </div>
      <div class="mt-10 text-xs text-emerald-700">
        <div class="mb-2"><span class="text-emerald-600">$</span> cat <span class="text-amber-400">links.txt</span></div>
        <ul class="space-y-1 pl-4">
          <li>
            <span class="text-gray-600">→ </span>
            <a href="https://github.com/rockneurotiko" class="text-amber-500 hover:text-amber-300 transition-colors">github.com/rockneurotiko</a>
          </li>
          <li>
            <span class="text-gray-600">→ </span>
            <a href="https://telegram.me/rockneurotiko" class="text-amber-500 hover:text-amber-300 transition-colors">telegram.me/rockneurotiko</a>
          </li>
        </ul>
      </div>
    </article>
    """
  end
end
