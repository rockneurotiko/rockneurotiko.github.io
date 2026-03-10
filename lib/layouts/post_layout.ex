defmodule Rock.PostLayout do
  use Tableau.Layout, layout: Rock.RootLayout
  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-2xl">
      <header class="mb-10">
        <div class="h-[2px] w-full bg-red-600 mb-6"></div>
        <div class="flex flex-wrap items-center gap-3 mb-4 font-mono text-[10px] tracking-widest uppercase text-zinc-600">
          <time datetime="<%= Calendar.strftime(@page.date, "%Y-%m-%d") %>">
            <%= Calendar.strftime(@page.date, "%Y.%m.%d") %>
          </time>
          <%= if @page[:categories] && length(@page[:categories]) > 0 do %>
            <span class="text-zinc-800">·</span>
            <%= for cat <- @page.categories do %>
              <span class="text-amber-600/70"><%= cat %></span>
            <% end %>
          <% end %>
        </div>
        <h1 class="font-mono font-bold text-white text-2xl leading-tight" style="letter-spacing: -0.01em;"><%= @page.title %></h1>
      </header>
      <div class="prose-carbon">
        <%= render @inner_content %>
      </div>
    </article>
    """
  end
end
