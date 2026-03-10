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
    <section class="max-w-2xl mx-auto">
      <div class="mb-10">
        <h1 class="font-mono font-bold text-white text-2xl mb-1 neon-text">&gt; rock_neurotiko<span class="animate-blink">_</span></h1>
        <p class="font-mono text-xs text-gray-600">// notes on code, games &amp; speed</p>
      </div>

      <div class="font-mono text-xs text-gray-600 mb-4">ls -lt ./posts</div>
      <ul class="space-y-2">
        <%= for post <- @sorted_posts do %>
          <li>
            <a href="<%= post[:permalink] %>" class="group flex justify-between items-start gap-4 bg-gray-900/40 border border-gray-800 rounded-lg px-4 py-3 hover:border-cyan-700/60 hover:bg-gray-900/80 hover:shadow-[0_0_16px_rgba(6,182,212,0.12)] transition-all duration-200">
              <span class="font-mono text-sm text-gray-300 group-hover:text-cyan-300 transition-colors leading-snug"><%= post[:title] %></span>
              <time class="font-mono text-[10px] text-gray-600 shrink-0 tabular-nums mt-0.5" datetime="<%= Calendar.strftime(post[:date], "%Y-%m-%d") %>">
                [<%= Calendar.strftime(post[:date], "%Y.%m.%d") %>]
              </time>
            </a>
          </li>
        <% end %>
      </ul>
    </section>
    """
  end
end
