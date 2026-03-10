defmodule Rock.PostLayout do
  use Tableau.Layout, layout: Rock.RootLayout
  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-2xl mx-auto">
      <header class="mb-10">
        <div class="flex flex-wrap items-center gap-2 mb-4 font-mono text-xs">
          <time class="text-gray-500 tabular-nums" datetime="<%= Calendar.strftime(@page.date, "%Y-%m-%d") %>">[<%= Calendar.strftime(@page.date, "%Y.%m.%d") %>]</time>
          <%= if @page[:categories] && length(@page[:categories]) > 0 do %>
            <%= for cat <- @page.categories do %>
              <span class="bg-cyan-950/50 text-cyan-400 border border-cyan-800/50 px-2 py-0.5 rounded text-[10px] font-mono">#<%= cat %></span>
            <% end %>
          <% end %>
        </div>
        <h1 class="font-mono font-bold text-white text-2xl leading-tight neon-text-subtle" style="letter-spacing: -0.01em;"><%= @page.title %></h1>
        <div class="mt-3 h-px bg-gradient-to-r from-cyan-500/50 via-cyan-800/30 to-transparent"></div>
      </header>
      <div class="prose-cyber">
        <%= render @inner_content %>
      </div>
    </article>
    """
  end
end
