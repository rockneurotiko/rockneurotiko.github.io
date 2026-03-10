defmodule Rock.PostLayout do
  use Tableau.Layout, layout: Rock.RootLayout
  import Rock

  def template(assigns) do
    ~H"""
    <div class="bg-indigo-700 text-white">
      <div class="max-w-5xl mx-auto px-6 py-14">
        <div class="flex flex-wrap gap-2 mb-4">
          <%= if @page[:categories] && length(@page[:categories]) > 0 do %>
            <%= for cat <- @page.categories do %>
              <span class="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide"><%= cat %></span>
            <% end %>
          <% end %>
        </div>
        <h1 class="text-3xl sm:text-4xl font-extrabold leading-tight mb-4 tracking-tight"><%= @page.title %></h1>
        <time class="text-indigo-300 text-sm" datetime="<%= Calendar.strftime(@page.date, "%Y-%m-%d") %>">
          <%= Calendar.strftime(@page.date, "%B %d, %Y") %>
        </time>
      </div>
    </div>
    <div class="max-w-3xl mx-auto px-6 py-12">
      <article class="prose-mag">
        <%= render @inner_content %>
      </article>
    </div>
    """
  end
end
