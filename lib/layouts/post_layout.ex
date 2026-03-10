defmodule Rock.PostLayout do
  use Tableau.Layout, layout: Rock.RootLayout
  import Rock

  def template(assigns) do
    ~H"""
    <article>
      <header>
        <h1><%= @page.title %></h1>
        <p>
          <%= Calendar.strftime(@page.date, "%B %d, %Y") %>
          <%= if Map.get(@page, :categories) do %>
            &mdash;
            <%= Enum.join(@page.categories, ", ") %>
          <% end %>
        </p>
      </header>

      <div class="post-content">
        <%= render @inner_content %>
      </div>
    </article>
    """
  end
end
