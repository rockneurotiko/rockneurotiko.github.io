defmodule Rock.HomePage do
  use Tableau.Page,
    layout: Rock.RootLayout,
    permalink: "/",
    title: "Home"

  import Rock

  def template(assigns) do
    ~H"""
    <section>
      <h1>Rock Neurotiko's Blog</h1>

      <ul>
        <%= for post <- Enum.sort_by(@posts, & &1[:date], {:desc, Date}) do %>
          <li>
            <a href="<%= post[:permalink] %>"><%= post[:title] %></a>
            <time datetime="<%= Calendar.strftime(post[:date], "%Y-%m-%d") %>">
              <%= Calendar.strftime(post[:date], "%B %d, %Y") %>
            </time>
          </li>
        <% end %>
      </ul>
    </section>
    """
  end
end
