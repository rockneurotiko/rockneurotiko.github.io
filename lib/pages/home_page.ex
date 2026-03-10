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
      <div class="mb-8 text-xs text-[#166534]">
        <div>$ ls -lt posts/</div>
        <div class="mt-1 text-[#4b5563]">total <%= length(@sorted_posts) %></div>
      </div>
      <ul class="space-y-1">
        <%= for post <- @sorted_posts do %>
          <li class="flex items-baseline gap-3 text-sm font-mono">
            <span class="text-[#166534] shrink-0 tabular-nums w-24"><%= Calendar.strftime(post[:date], "%Y-%m-%d") %></span>
            <span class="text-[#166534]">-rw-r--r--</span>
            <a href="<%= post[:permalink] %>" class="text-[#4ade80] hover:text-[#fbbf24] transition-colors border-b border-transparent hover:border-[#fbbf24]">
              <%= post[:title] %>
            </a>
          </li>
        <% end %>
      </ul>
    </section>
    """
  end
end
