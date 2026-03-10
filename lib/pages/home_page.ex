defmodule Rock.HomePage do
  use Tableau.Page, layout: Rock.RootLayout, permalink: "/", title: "Home"
  import Rock

  def template(assigns) do
    posts = Enum.sort_by(assigns.posts, & &1[:date], {:desc, Date})

    assigns = Map.put(assigns, :sorted_posts, posts)

    ~H"""
    <div class="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white py-16">
      <div class="max-w-4xl mx-auto px-6">
        <h1 class="text-4xl font-extrabold mb-3">Rock Neurotiko's Blog</h1>
        <p class="text-indigo-300 text-lg">Writing about software, bots, and engineering.</p>
      </div>
    </div>
    <section class="max-w-4xl mx-auto px-6 py-12">
      <h2 class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Latest Posts</h2>
      <div class="grid sm:grid-cols-2 gap-6">
        <%= for post <- @sorted_posts do %>
          <a href={post[:permalink]} class="group block border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div class="flex gap-2 mb-3 flex-wrap">
              <%= if post[:categories] do %>
                <%= for cat <- post.categories do %>
                  <span class="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full"><%= cat %></span>
                <% end %>
              <% end %>
            </div>
            <h3 class="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug mb-3"><%= post[:title] %></h3>
            <time class="text-xs text-gray-400" datetime={Calendar.strftime(post[:date], "%Y-%m-%d")}>
              <%= Calendar.strftime(post[:date], "%B %d, %Y") %>
            </time>
          </a>
        <% end %>
      </div>
    </section>
    """
  end
end
