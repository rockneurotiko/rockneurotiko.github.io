defmodule Rock.PostLayout do
  use Tableau.Layout, layout: Rock.RootLayout
  import Rock

  def template(assigns) do
    ~H"""
    <article class="max-w-3xl mx-auto px-6 py-10">
      <header class="mb-10 border-b border-emerald-900/50 pb-6">
        <div class="text-xs text-emerald-700 mb-3">
          <span class="text-emerald-600">$</span> cat
          <span class="text-amber-400">
            <%= Calendar.strftime(@page.date, "%Y-%m-%d") %>-<%= String.downcase(String.replace(@page.title, " ", "-")) %>.md
          </span>
        </div>
        <h1 class="text-2xl font-bold text-emerald-200 leading-snug mb-3">&gt; <%= @page.title %></h1>
        <p class="text-xs text-emerald-700">
          <span class="text-gray-600">// </span>
          <time datetime={Calendar.strftime(@page.date, "%Y-%m-%d")}>
            <%= Calendar.strftime(@page.date, "%B %d, %Y") %>
          </time>
          <%= if @page[:categories] do %>
            <span class="ml-3">
              <%= for cat <- @page.categories do %>
                <span class="text-amber-600 mr-2">#<%= cat %></span>
              <% end %>
            </span>
          <% end %>
        </p>
      </header>
      <div class="post-content prose-terminal">
        <%= render @inner_content %>
      </div>
    </article>
    """
  end
end
