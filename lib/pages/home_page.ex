defmodule Rock.HomePage do
  use Tableau.Page, layout: Rock.RootLayout, permalink: "/", title: "Home"
  import Rock

  def template(assigns) do
    posts = Enum.sort_by(assigns.posts, & &1[:date], {:desc, Date})

    assigns = Map.put(assigns, :sorted_posts, posts)

    ~H"""
    <section class="max-w-3xl mx-auto px-6 py-10">
      <div class="text-xs text-emerald-700 mb-6">
        <span class="text-emerald-600">$</span> ls -la <span class="text-amber-400">./posts/</span>
      </div>
      <div class="border border-emerald-900/60 rounded">
        <div class="border-b border-emerald-900/60 px-4 py-2 text-xs text-emerald-800 grid grid-cols-[140px_1fr]">
          <span>date</span>
          <span>title</span>
        </div>
        <%= for post <- @sorted_posts do %>
          <a href={post[:permalink]} class="grid grid-cols-[140px_1fr] px-4 py-3 text-sm hover:bg-emerald-950/60 transition-colors border-b border-emerald-900/30 last:border-0 group">
            <time class="text-emerald-700 group-hover:text-emerald-500 transition-colors" datetime={Calendar.strftime(post[:date], "%Y-%m-%d")}>
              <%= Calendar.strftime(post[:date], "%Y-%m-%d") %>
            </time>
            <span class="text-emerald-300 group-hover:text-emerald-100 transition-colors"><%= post[:title] %></span>
          </a>
        <% end %>
      </div>
    </section>
    """
  end
end
