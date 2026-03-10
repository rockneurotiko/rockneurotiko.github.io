defmodule Rock.HomePage do
  use Tableau.Page, layout: Rock.RootLayout, permalink: "/", title: "Home"
  import Rock

  def template(assigns) do
    posts = Enum.sort_by(assigns.posts, & &1[:date], {:desc, Date})

    assigns = Map.put(assigns, :sorted_posts, posts)

    ~H"""
    <section class="max-w-2xl mx-auto px-6 py-12">
      <h1 class="text-2xl font-semibold text-gray-900 mb-10">Writing</h1>
      <ul class="divide-y divide-gray-100">
        <%= for post <- @sorted_posts do %>
          <li class="py-4 flex justify-between items-baseline gap-4">
            <a href={post[:permalink]} class="text-gray-800 hover:text-gray-500 transition-colors font-medium"><%= post[:title] %></a>
            <time class="text-sm text-gray-400 shrink-0" datetime={Calendar.strftime(post[:date], "%Y-%m-%d")}>
              <%= Calendar.strftime(post[:date], "%b %Y") %>
            </time>
          </li>
        <% end %>
      </ul>
    </section>
    """
  end
end
