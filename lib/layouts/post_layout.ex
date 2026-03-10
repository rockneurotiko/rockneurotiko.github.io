defmodule Rock.PostLayout do
  use Tableau.Layout, layout: Rock.RootLayout
  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-2xl mx-auto px-6 py-12">
      <header class="mb-10">
        <h1 class="text-3xl font-bold leading-tight text-stone-900 mb-4 border-l-4 border-teal-400 pl-4"><%= @page.title %></h1>
        <div class="flex items-center gap-3 flex-wrap">
          <span class="inline-flex items-center bg-teal-50 text-teal-700 text-xs font-medium px-3 py-1 rounded-full border border-teal-200">
            <time datetime={Calendar.strftime(@page.date, "%Y-%m-%d")}>
              <%= Calendar.strftime(@page.date, "%B %d, %Y") %>
            </time>
          </span>
          <%= if @page[:categories] do %>
            <%= for cat <- @page.categories do %>
              <span class="inline-flex items-center bg-stone-100 text-stone-600 text-xs font-medium px-3 py-1 rounded-full border border-stone-200"><%= cat %></span>
            <% end %>
          <% end %>
        </div>
      </header>
      <div class="post-content prose-notebook">
        <%= render @inner_content %>
      </div>
    </article>
    """
  end
end
