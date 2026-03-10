defmodule Rock.PostLayout do
  use Tableau.Layout, layout: Rock.RootLayout
  import Rock

  def template(assigns) do
    ~H"""
    <div class="bg-indigo-700 text-white">
      <div class="max-w-4xl mx-auto px-6 py-12">
        <%= if @page[:categories] do %>
          <div class="flex gap-2 mb-4">
            <%= for cat <- @page.categories do %>
              <span class="text-xs font-semibold uppercase tracking-wider bg-orange-500 text-white px-3 py-1 rounded-full"><%= cat %></span>
            <% end %>
          </div>
        <% end %>
        <h1 class="text-3xl sm:text-4xl font-extrabold leading-tight mb-4"><%= @page.title %></h1>
        <p class="text-indigo-200 text-sm">
          <time datetime={Calendar.strftime(@page.date, "%Y-%m-%d")}>
            <%= Calendar.strftime(@page.date, "%B %d, %Y") %>
          </time>
          <span class="mx-2">&middot;</span>
          <span>Rock Neurotiko</span>
        </p>
      </div>
    </div>
    <article class="max-w-4xl mx-auto px-6 py-12">
      <div class="post-content prose-magazine">
        <%= render @inner_content %>
      </div>
    </article>
    """
  end
end
