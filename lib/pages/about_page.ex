defmodule Rock.AboutPage do
  use Tableau.Page,
    layout: Rock.RootLayout,
    permalink: "/about",
    title: "About Me"

  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-2xl">
      <div class="mb-8">
        <p class="font-mono text-[9px] tracking-widest uppercase text-zinc-600 mb-1">DRIVER PROFILE</p>
        <div class="h-[2px] w-full bg-red-600"></div>
      </div>
      <div class="space-y-px font-mono text-sm">
        <div class="flex border-b border-zinc-900 py-3">
          <span class="text-[10px] tracking-widest uppercase text-zinc-600 w-28 shrink-0 pt-0.5">NAME</span>
          <span class="text-white">Rock Neurotiko</span>
        </div>
        <div class="flex border-b border-zinc-900 py-3">
          <span class="text-[10px] tracking-widest uppercase text-zinc-600 w-28 shrink-0 pt-0.5">BASE</span>
          <span class="text-zinc-300">Madrid, Spain</span>
        </div>
        <div class="flex border-b border-zinc-900 py-3">
          <span class="text-[10px] tracking-widest uppercase text-zinc-600 w-28 shrink-0 pt-0.5">STACK</span>
          <div class="flex flex-wrap gap-2">
            <span class="bg-zinc-900 border border-zinc-700 text-amber-500 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">Elixir</span>
            <span class="bg-zinc-900 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">Scala</span>
            <span class="bg-zinc-900 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">Rust</span>
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
        <div class="flex py-3">
          <span class="text-[10px] tracking-widest uppercase text-zinc-600 w-28 shrink-0 pt-0.5">TELEGRAM</span>
          <a href="https://telegram.me/rockneurotiko" class="text-red-400 hover:text-red-300 transition-colors">telegram.me/rockneurotiko</a>
        </div>
      </div>
    </article>
    """
  end
end
