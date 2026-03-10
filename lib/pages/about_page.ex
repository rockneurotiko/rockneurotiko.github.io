defmodule Rock.AboutPage do
  use Tableau.Page, layout: Rock.RootLayout, permalink: "/about", title: "About Me"
  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-2xl mx-auto px-6 py-12">
      <h1 class="text-3xl font-bold text-stone-900 mb-8 border-l-4 border-teal-400 pl-4">About Me</h1>
      <div class="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 space-y-4 text-stone-700 leading-relaxed">
        <p>
          I'm a software engineer based in <strong class="text-stone-900 font-semibold">Madrid</strong>. I work with Elixir, Scala, and Rust — among other things.
        </p>
        <p>
          This is my corner of the internet where I write about programming, bots, and whatever else I find interesting.
        </p>
      </div>
      <div class="mt-8 flex gap-3">
        <a href="https://github.com/rockneurotiko" class="inline-flex items-center bg-white border border-stone-200 text-stone-700 font-medium text-sm px-5 py-2.5 rounded-xl shadow-sm hover:border-teal-300 hover:text-teal-700 transition-all">
          GitHub
        </a>
        <a href="https://telegram.me/rockneurotiko" class="inline-flex items-center bg-white border border-stone-200 text-stone-700 font-medium text-sm px-5 py-2.5 rounded-xl shadow-sm hover:border-teal-300 hover:text-teal-700 transition-all">
          Telegram
        </a>
      </div>
    </article>
    """
  end
end
