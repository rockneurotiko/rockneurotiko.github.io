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
      <div class="mb-10">
        <h1 class="text-2xl font-bold text-stone-900 mb-1 tracking-tight">Rock Neurotiko's Blog</h1>
        <p class="text-stone-400 text-sm">Notes on software, engineering, and building things.</p>
      </div>
      <ul class="space-y-3">
        <%= for post <- @sorted_posts do %>
          <li>
            <a href="<%= post[:permalink] %>" class="group flex justify-between items-start gap-4 bg-white border border-stone-200 rounded-xl px-5 py-4 hover:border-teal-300 hover:shadow-sm transition-all duration-150">
              <span class="font-medium text-stone-800 group-hover:text-teal-700 transition-colors leading-snug"><%= post[:title] %></span>
              <time class="text-xs text-stone-400 shrink-0 mt-0.5 tabular-nums bg-stone-100 px-2 py-0.5 rounded-md" datetime="<%= Calendar.strftime(post[:date], "%Y-%m-%d") %>">
                <%= Calendar.strftime(post[:date], "%b %Y") %>
              </time>
            </a>
          </li>
        <% end %>
      </ul>
    </section>
    """
  end
end
