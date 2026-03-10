defmodule Rock.HomePage do
  use Tableau.Page,
    layout: Rock.RootLayout,
    permalink: "/",
    title: "Home"

  import Rock

  def template(assigns) do
    posts = Enum.sort_by(assigns[:posts] || [], & &1[:date], {:desc, Date})

    assigns = Map.put(assigns, :sorted_posts, posts)

    ~H"""
    <section>
      <h1 class="text-2xl font-bold text-gray-900 mb-1" style="font-family: Georgia, serif; letter-spacing: -0.02em;">Rock Neurotiko's Blog</h1>
      <p class="text-gray-400 text-sm mb-10">Notes on software, engineering, and everything in between.</p>
      <ul class="divide-y divide-gray-100">
        <%= for post <- @sorted_posts do %>
          <li>
            <a href="<%= post[:permalink] %>" class="flex justify-between items-baseline py-4 group">
              <span class="text-gray-900 group-hover:text-gray-500 transition-colors"><%= post[:title] %></span>
              <time class="text-sm text-gray-400 shrink-0 ml-6 tabular-nums" datetime="<%= Calendar.strftime(post[:date], "%Y-%m-%d") %>">
                <%= Calendar.strftime(post[:date], "%b %d, %Y") %>
              </time>
            </a>
          </li>
        <% end %>
      </ul>
    </section>
    """
  end
end
