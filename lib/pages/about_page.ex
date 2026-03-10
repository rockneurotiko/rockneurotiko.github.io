defmodule Rock.AboutPage do
  use Tableau.Page,
    layout: Rock.RootLayout,
    permalink: "/about",
    title: "About Me"

  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-2xl mx-auto">
      <div class="mb-8 font-mono">
        <span style="color: var(--accent);" class="text-sm">defmodule</span>
        <span style="color: var(--text-bright);" class="text-xl font-bold ml-2">Rock.Neurotiko</span>
        <span style="color: var(--accent);" class="text-sm ml-2">do</span>
      </div>
      <div style="border-color: var(--border);" class="space-y-6 pl-5 border-l-2 font-mono text-sm">
        <div>
          <div style="color: var(--accent-2);" class="mb-2">@bio</div>
          <p style="color: var(--text-base);" class="pl-4 leading-relaxed">
            Hi! I'm Rock Neurotiko, a software engineer based in Madrid.
            I mainly program in Elixir, enjoy videogames and cars.
          </p>
        </div>
        <div>
          <div style="color: var(--accent-2);" class="mb-2">@stack</div>
          <p style="color: var(--text-base);" class="pl-4 leading-relaxed">Elixir · Scala · Rust · and whatever the job demands</p>
        </div>
        <div>
          <div style="color: var(--accent-2);" class="mb-2">@interests</div>
          <p style="color: var(--text-base);" class="pl-4 leading-relaxed">🎮 Videogames · 🚗 Cars · ⚗️ Functional Programming</p>
        </div>
        <div>
          <div style="color: var(--accent-2);" class="mb-2">@links</div>
          <div class="pl-4 space-y-2">
            <a href="https://github.com/rockneurotiko" style="color: var(--link);" class="flex items-center gap-2 hover:opacity-80 transition-opacity group">
              <span style="color: var(--nav-dim);" class="group-hover:opacity-80 transition-opacity">#</span>
              github.com/rockneurotiko
            </a>
          </div>
        </div>
        <div class="flex border-b border-zinc-900 py-3">
          <span class="text-[10px] tracking-widest uppercase text-zinc-600 w-28 shrink-0 pt-0.5">INTERESTS</span>
          <span class="text-zinc-300">Elixir · Videogames · Cars</span>
        </div>
        <div class="flex border-b border-zinc-900 py-3">
          <span class="text-[10px] tracking-widest uppercase text-zinc-600 w-28 shrink-0 pt-0.5">GITHUB</span>
          <a href="https://github.com/rockneurotiko" class="text-red-400 hover:text-red-300 transition-colors">github.com/rockneurotiko</a>
        </div>
      </div>
      <div style="color: var(--accent);" class="mt-8 font-mono text-sm">end</div>
    </article>
    """
  end
end
