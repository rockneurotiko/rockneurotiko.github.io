defmodule Rock.RootLayout do
  use Tableau.Layout, layout: nil
  import Rock

  def template(assigns) do
    posts = Enum.sort_by(assigns[:posts] || [], & &1[:date], {:desc, Date})
    assigns = Map.put(assigns, :nav_posts, posts)

    ~H"""
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title><%= Enum.reject([@page[:title], "rock"], &is_nil/1) |> Enum.join(" | ") %></title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/css/site.css" />
      </head>
      <body class="bg-[#0c0c0c] text-zinc-400 antialiased min-h-screen">

        <%!-- Mobile top bar --%>
        <header class="md:hidden bg-[#111111] border-b-2 border-red-600 px-4 py-3 flex justify-between items-center">
          <a href="/" class="font-mono font-bold text-white text-sm tracking-widest uppercase">ROCK NEUROTIKO</a>
          <nav class="flex gap-4 font-mono text-[10px] tracking-widest uppercase">
            <a href="/" class="text-zinc-500 hover:text-red-400 transition-colors">Home</a>
            <a href="/about" class="text-zinc-500 hover:text-red-400 transition-colors">About</a>
          </nav>
        </header>

        <div class="flex min-h-screen">
          <%!-- Desktop sidebar --%>
          <aside class="hidden md:flex flex-col w-52 fixed inset-y-0 left-0 bg-[#111111] border-r border-zinc-800/60 overflow-y-auto">

            <%!-- Brand --%>
            <div class="px-5 pt-7 pb-5">
              <a href="/" class="block font-mono font-bold text-white text-xs tracking-[0.2em] uppercase leading-relaxed hover:text-red-400 transition-colors">
                ROCK<br/>NEUROTIKO
              </a>
              <div class="mt-2 h-[2px] w-8 bg-red-600"></div>
              <p class="font-mono text-[9px] text-zinc-600 mt-2 tracking-widest uppercase">Software Engineer</p>
            </div>

            <%!-- Nav section --%>
            <nav class="px-4 py-3 border-t border-zinc-800/60">
              <p class="font-mono text-[9px] text-zinc-600 tracking-widest uppercase mb-2 px-1">NAV</p>
              <div class="space-y-0.5">
                <a href="/" class="flex items-center gap-2 px-2 py-1.5 font-mono text-[11px] tracking-wide uppercase text-zinc-400 hover:text-white hover:border-l-2 hover:border-red-600 hover:pl-[6px] transition-all duration-100">
                  HOME
                </a>
                <a href="/about" class="flex items-center gap-2 px-2 py-1.5 font-mono text-[11px] tracking-wide uppercase text-zinc-400 hover:text-white hover:border-l-2 hover:border-red-600 hover:pl-[6px] transition-all duration-100">
                  ABOUT
                </a>
              </div>
            </nav>

            <%!-- Posts section --%>
            <nav class="px-4 py-3 border-t border-zinc-800/60 flex-1">
              <p class="font-mono text-[9px] text-zinc-600 tracking-widest uppercase mb-2 px-1">POSTS</p>
              <div class="space-y-0.5">
                <%= for post <- @nav_posts do %>
                  <a href="<%= post[:permalink] %>" class="block px-2 py-1.5 font-mono text-[10px] text-zinc-500 hover:text-red-400 transition-colors leading-snug">
                    <div class="truncate"><%= post[:title] %></div>
                    <div class="text-[9px] text-zinc-700 mt-0.5 tabular-nums"><%= Calendar.strftime(post[:date], "%Y.%m.%d") %></div>
                  </a>
                <% end %>
              </div>
            </nav>

            <%!-- Sidebar footer --%>
            <div class="px-5 py-4 border-t border-zinc-800/60">
              <p class="font-mono text-[9px] text-zinc-700 tracking-widest uppercase">EST. 2015 · MADRID</p>
              <div class="mt-2 flex gap-3 font-mono text-[9px]">
                <a href="https://github.com/rockneurotiko" class="text-zinc-600 hover:text-red-400 transition-colors">GH</a>
                <a href="https://telegram.me/rockneurotiko" class="text-zinc-600 hover:text-red-400 transition-colors">TG</a>
              </div>
            </div>
          </aside>

          <%!-- Main content --%>
          <main class="flex-1 md:ml-52 px-6 py-10">
            <%= render @inner_content %>
          </main>
        </div>

        <%= if Mix.env() == :dev do Tableau.live_reload(assigns) end %>
      </body>
    </html>
    """
  end
end
