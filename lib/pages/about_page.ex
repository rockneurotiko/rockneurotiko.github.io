defmodule Rock.AboutPage do
  use Tableau.Page,
    layout: Rock.RootLayout,
    permalink: "/about",
    title: "About Me"

  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-2xl mx-auto">
      <div class="mb-8">
        <h1 class="font-mono font-bold text-white text-2xl mb-1 neon-text">&gt; whoami</h1>
        <div class="h-px bg-gradient-to-r from-cyan-500/50 via-cyan-800/30 to-transparent"></div>
      </div>
      <div class="space-y-6 font-mono text-sm">
        <div class="bg-gray-900/40 border border-gray-800 rounded-lg p-5">
          <div class="text-xs text-gray-600 mb-3">// bio</div>
          <p class="text-gray-300 leading-relaxed">
            Hi! I'm Rock Neurotiko, a software engineer based in Madrid.
            I work mainly with Elixir, and enjoy videogames and cars.
          </p>
        </div>
        <div class="bg-gray-900/40 border border-gray-800 rounded-lg p-5">
          <div class="text-xs text-gray-600 mb-3">// stack</div>
          <div class="flex flex-wrap gap-2">
            <span class="bg-cyan-950/50 text-cyan-400 border border-cyan-800/50 px-2 py-1 rounded text-xs">elixir</span>
            <span class="bg-rose-950/50 text-rose-400 border border-rose-800/50 px-2 py-1 rounded text-xs">scala</span>
            <span class="bg-lime-950/50 text-lime-400 border border-lime-800/50 px-2 py-1 rounded text-xs">rust</span>
          </div>
        </div>
        <div class="bg-gray-900/40 border border-gray-800 rounded-lg p-5">
          <div class="text-xs text-gray-600 mb-3">// links</div>
          <div class="space-y-2">
            <a href="https://github.com/rockneurotiko" class="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:shadow-[0_0_8px_rgba(6,182,212,0.3)] transition-all">
              <span class="text-gray-600">→</span> github.com/rockneurotiko
            </a>
            <a href="https://telegram.me/rockneurotiko" class="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:shadow-[0_0_8px_rgba(6,182,212,0.3)] transition-all">
              <span class="text-gray-600">→</span> telegram.me/rockneurotiko
            </a>
          </div>
        </div>
      </div>
    </article>
    """
  end
end
