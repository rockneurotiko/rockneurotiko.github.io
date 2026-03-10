defmodule Rock.PostLayout do
  use Tableau.Layout, layout: Rock.RootLayout
  import Rock

  def template(assigns) do
    ~H"""
    <article>
      <header class="mb-8 pb-6 border-b border-[#166534]">
        <div class="text-xs text-[#6b7280] mb-3">
          <span class="text-[#166534]">$</span> cat posts/<%= String.replace(@page.title, " ", "-") |> String.downcase() %>.md
        </div>
        <h1 class="text-2xl font-bold text-[#4ade80] mb-3 leading-tight" style="text-shadow: 0 0 20px rgba(74,222,128,0.3);">
          &gt; <%= @page.title %>
        </h1>
        <div class="flex items-center gap-3 text-xs text-[#166534]">
          <span>// <time datetime="<%= Calendar.strftime(@page.date, "%Y-%m-%d") %>"><%= Calendar.strftime(@page.date, "%Y-%m-%d") %></time></span>
          <%= if @page[:categories] && length(@page[:categories]) > 0 do %>
            <span class="text-[#4b5563]">|</span>
            <span class="text-[#6b7280]">[<%= Enum.join(@page.categories, ", ") %>]</span>
          <% end %>
        </div>
      </header>
      <div class="prose-terminal">
        <%= render @inner_content %>
      </div>
    </article>
    """
  end
end
