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
      <div class="mb-8">
        <p class="font-mono text-[9px] tracking-widest uppercase text-zinc-600 mb-1">ALL POSTS</p>
        <div class="h-[2px] w-full bg-zinc-800"></div>
      </div>
      <ul class="divide-y divide-zinc-900">
        <%= for {post, idx} <- Enum.with_index(@sorted_posts) do %>
          <li>
            <a href="<%= post[:permalink] %>" class="group flex justify-between items-center gap-4 py-4 px-2 <%= if rem(idx, 2) == 0, do: "bg-[#0e0e0e]", else: "bg-transparent" %> hover:bg-zinc-900 transition-colors duration-100">
              <div class="flex items-center gap-3 min-w-0">
                <span class="font-mono text-[10px] text-zinc-700 tabular-nums shrink-0 w-4 text-right"><%= idx + 1 %>.</span>
                <div class="w-[2px] h-4 bg-zinc-800 group-hover:bg-red-600 transition-colors shrink-0"></div>
                <span class="font-mono text-sm text-zinc-400 group-hover:text-white transition-colors truncate"><%= post[:title] %></span>
              </div>
              <time class="font-mono text-[10px] text-zinc-700 shrink-0 tabular-nums" datetime="<%= Calendar.strftime(post[:date], "%Y-%m-%d") %>">
                <%= Calendar.strftime(post[:date], "%Y.%m.%d") %>
              </time>
            </a>
          </li>
        <% end %>
      </ul>
    </section>
    """
  end
end
