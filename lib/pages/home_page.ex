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
    <section class="max-w-2xl">
      <div class="mb-10">
        <h1 class="text-xl font-mono font-bold text-violet-100 mb-1">
          <span class="text-purple-600">defmodule</span> <span class="text-purple-300">Blog</span> <span class="text-purple-600">do</span>
        </h1>
        <p class="font-mono text-xs text-purple-700 pl-4">fn -&gt; notes on elixir, code &amp; building things end</p>
      </div>
      <div class="font-mono text-xs text-purple-700 mb-3 pl-1"># posts |&gt; Enum.sort_by(&amp;date, :desc)</div>
      <ul class="space-y-2">
        <%= for post <- @sorted_posts do %>
          <li>
            <a href="<%= post[:permalink] %>" class="group flex justify-between items-start gap-4 bg-[#0f0f1a] border border-purple-900/40 rounded-lg px-4 py-3 hover:border-purple-500/60 hover:shadow-[0_0_12px_rgba(168,85,247,0.15)] transition-all duration-200">
              <span class="font-mono text-sm text-violet-300 group-hover:text-purple-200 transition-colors leading-snug"><%= post[:title] %></span>
              <time class="font-mono text-[10px] text-purple-700 shrink-0 mt-0.5 tabular-nums" datetime="<%= Calendar.strftime(post[:date], "%Y-%m-%d") %>">
                <%= Calendar.strftime(post[:date], "%Y-%m") %>
              </time>
            </a>
          </li>
        <% end %>
      </ul>
      <div class="mt-8 font-mono text-xs text-purple-800 pl-1">end</div>
    </section>
    """
  end
end
