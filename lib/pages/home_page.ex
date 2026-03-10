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
        <h1 class="text-xl font-mono font-bold mb-2">
          <span style="color: var(--accent);">defmodule</span>
          <span style="color: var(--text-bright);">Blog</span>
          <span style="color: var(--accent);">do</span>
        </h1>
      </div>
      <div style="color: var(--nav-dim);" class="font-mono text-xs mb-4 pl-1"># Enum.sort_by(posts, &amp; &amp;1.date, :desc)</div>
      <ul class="space-y-3">
        <%= for post <- @sorted_posts do %>
          <li>
            <a href="<%= post[:permalink] %>"
               style="background-color: var(--bg-sidebar); border-color: var(--border-subtle);"
               class="group flex justify-between items-start gap-4 border rounded-lg px-5 py-4 hover:border-[color:var(--border-accent)] transition-all duration-200">
              <span style="color: var(--text-base);" class="font-mono text-sm group-hover:opacity-90 transition-opacity leading-snug"><%= post[:title] %></span>
              <time style="color: var(--accent-2);" class="font-mono text-sm shrink-0 mt-0.5 tabular-nums" datetime="<%= Calendar.strftime(post[:date], "%Y-%m-%d") %>">
                <%= Calendar.strftime(post[:date], "%Y-%m") %>
              </time>
            </a>
          </li>
        <% end %>
      </ul>
      <div style="color: var(--nav-dim);" class="mt-8 font-mono text-xs pl-1"><span style="color: var(--accent);">end</span></div>
    </section>
    """
  end
end
