defmodule Rock.PostLayout do
  use Tableau.Layout, layout: Rock.RootLayout
  import Rock

  def template(assigns) do
    ~H"""
    <article>
      <header class="mb-10">
        <h1 class="text-3xl font-bold text-stone-900 mb-4 leading-tight border-l-4 border-teal-400 pl-4" style="letter-spacing: -0.015em;"><%= @page.title %></h1>
        <div class="flex flex-wrap items-center gap-2 pl-5">
          <span class="bg-teal-100 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full">
            <time datetime="<%= Calendar.strftime(@page.date, "%Y-%m-%d") %>"><%= Calendar.strftime(@page.date, "%B %d, %Y") %></time>
          </span>
          <%= if @page[:categories] && length(@page[:categories]) > 0 do %>
            <%= for cat <- @page.categories do %>
              <span class="bg-stone-100 text-stone-600 text-xs font-medium px-3 py-1 rounded-full"><%= cat %></span>
            <% end %>
          <% end %>
        </div>
      </header>
      <div class="prose-notebook">
        <%= render @inner_content %>
      </div>
    </article>
    """
  end
end
