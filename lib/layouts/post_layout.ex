defmodule Rock.PostLayout do
  use Tableau.Layout, layout: Rock.RootLayout
  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-2xl mx-auto px-6 py-12">
      <header class="mb-10">
        <h1 class="text-3xl font-semibold leading-tight text-gray-900 mb-3"><%= @page.title %></h1>
        <p class="text-sm text-gray-400">
          <time datetime={Calendar.strftime(@page.date, "%Y-%m-%d")}>
            <%= Calendar.strftime(@page.date, "%B %d, %Y") %>
          </time>
          <%= if @page[:categories] do %>
            &nbsp;&middot;&nbsp;
            <span class="text-gray-400"><%= Enum.join(@page.categories, ", ") %></span>
          <% end %>
        </p>
      </header>
      <div class="post-content prose">
        <%= render @inner_content %>
      </div>
    </article>
    """
  end
end
