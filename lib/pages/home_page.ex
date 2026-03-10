defmodule Rock.HomePage do
  use Tableau.Page, layout: Rock.RootLayout, permalink: "/", title: "Home"
  import Rock

  def template(assigns) do
    posts = Enum.sort_by(assigns.posts, & &1[:date], {:desc, Date})

    assigns = Map.put(assigns, :sorted_posts, posts)

    ~H"""
    <section class="max-w-2xl mx-auto px-6 py-12">
      <div class="mb-10">
        <h1 class="text-3xl font-bold text-stone-900 mb-2">Rock Neurotiko's Blog</h1>
        <p class="text-stone-500 text-base">Thoughts on software, bots, and engineering.</p>
      </div>
      <ul class="space-y-1">
        <%= for post <- @sorted_posts do %>
          <li>
            <a href={post[:permalink]} class="group flex justify-between items-baseline py-4 px-4 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-stone-200 transition-all duration-150">
              <div class="flex items-baseline gap-3">
                <span class="text-teal-400 text-sm select-none">&bull;</span>
                <span class="text-stone-800 font-medium group-hover:text-teal-700 transition-colors"><%= post[:title] %></span>
              </div>
              <time class="text-xs text-stone-400 shrink-0 ml-4" datetime={Calendar.strftime(post[:date], "%Y-%m-%d")}>
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
