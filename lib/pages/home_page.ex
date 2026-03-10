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
    <div class="bg-gray-50 border-b border-gray-200 py-14">
      <div class="max-w-5xl mx-auto px-6">
        <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Rock Neurotiko's Blog</h1>
        <p class="text-gray-500 text-lg">Notes on software, engineering, and building things.</p>
      </div>
    </div>
    <div class="max-w-5xl mx-auto px-6 py-12">
      <div class="grid gap-6 sm:grid-cols-2">
        <%= for post <- @sorted_posts do %>
          <a href="<%= post[:permalink] %>" class="group block bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div class="flex flex-wrap gap-2 mb-3">
              <%= for cat <- (post[:categories] || []) do %>
                <span class="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"><%= cat %></span>
              <% end %>
            </div>
            <h2 class="font-bold text-gray-900 text-lg leading-snug mb-2 group-hover:text-indigo-600 transition-colors"><%= post[:title] %></h2>
            <time class="text-sm text-gray-400 tabular-nums" datetime="<%= Calendar.strftime(post[:date], "%Y-%m-%d") %>">
              <%= Calendar.strftime(post[:date], "%B %d, %Y") %>
            </time>
          </a>
        <% end %>
      </div>
    </div>
    """
  end
end
