defmodule Rock.AboutPage do
  use Tableau.Page,
    layout: Rock.RootLayout,
    permalink: "/about",
    title: "About Me"

  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-2xl">
      <div class="mb-8 font-mono">
        <span class="text-purple-600 text-sm">defmodule</span>
        <span class="text-purple-300 text-xl font-bold ml-2">Rock.Neurotiko</span>
        <span class="text-purple-600 text-sm ml-2">do</span>
      </div>
      <div class="space-y-4 pl-4 border-l border-purple-900/50 prose-elixir font-mono text-sm">
        <div>
          <span class="text-purple-600">@bio</span>
          <p class="text-violet-300 mt-1 pl-4 leading-relaxed">
            Hi! I'm Rock Neurotiko, a software engineer based in Madrid.
            I work mainly with Elixir, and enjoy videogames and cars.
          </p>
        </div>
        <div>
          <span class="text-purple-600">@stack</span>
          <p class="text-violet-300 mt-1 pl-4 leading-relaxed">Elixir · Scala · Rust · and whatever the job demands</p>
        </div>
        <div>
          <span class="text-purple-600">@links</span>
          <div class="mt-1 pl-4 space-y-1">
            <a href="https://github.com/rockneurotiko" class="block text-sky-400 hover:text-sky-300 transition-colors">github.com/rockneurotiko</a>
            <a href="https://telegram.me/rockneurotiko" class="block text-sky-400 hover:text-sky-300 transition-colors">telegram.me/rockneurotiko</a>
          </div>
        </div>
      </div>
      <div class="mt-8 font-mono text-sm text-purple-800">end</div>
    </article>
    """
  end
end
