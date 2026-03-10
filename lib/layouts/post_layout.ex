defmodule Rock.PostLayout do
  use Tableau.Layout, layout: Rock.RootLayout
  import Rock

  def template(assigns) do
    ~H"""
    <article>
      <header class="mb-10 pb-8 border-b border-gray-100">
        <h1 class="text-3xl font-bold text-gray-900 mb-3 leading-tight" style="font-family: Georgia, serif; letter-spacing: -0.02em;"><%= @page.title %></h1>
        <div class="flex items-center gap-3 text-sm text-gray-400">
          <time datetime="<%= Calendar.strftime(@page.date, "%Y-%m-%d") %>">
            <%= Calendar.strftime(@page.date, "%B %d, %Y") %>
          </time>
          <%= if @page[:categories] && length(@page[:categories]) > 0 do %>
            <span>&mdash;</span>
            <span><%= Enum.join(@page.categories, ", ") %></span>
          <% end %>
        </div>
      </header>
      <div class="prose-mono">
        <%= render @inner_content %>
      </div>
    </article>
    """
  end
end
