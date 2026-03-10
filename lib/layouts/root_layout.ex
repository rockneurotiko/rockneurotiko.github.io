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
      <body class="bg-[#0a0a12] text-violet-200 antialiased min-h-screen">

        <%# Mobile top bar %>
        <header class="md:hidden bg-[#0f0f1a] border-b border-purple-900/50 px-4 py-3 flex justify-between items-center">
          <a href="/" class="font-mono font-bold text-purple-400 text-sm">rock |&gt; neurotiko</a>
          <nav class="flex gap-3 text-xs font-mono">
            <a href="/" class="text-violet-400 hover:text-purple-300 transition-colors">~/home</a>
            <a href="/about" class="text-violet-400 hover:text-purple-300 transition-colors">~/about</a>
          </nav>
        </header>

        <div class="flex min-h-screen">
          <%# Desktop sidebar %>
          <aside class="hidden md:flex flex-col w-56 fixed inset-y-0 left-0 bg-[#0f0f1a] border-r border-purple-900/40 overflow-y-auto">

            <%# Brand %>
            <div class="px-4 pt-6 pb-4 border-b border-purple-900/30">
              <a href="/" class="block font-mono font-bold text-purple-400 text-sm leading-relaxed hover:text-purple-300 transition-colors">
                rock |&gt; neurotiko
              </a>
              <p class="font-mono text-[10px] text-purple-800 mt-0.5">mix run --blog</p>
            </div>

            <%# Directory tree %>
            <nav class="flex-1 px-3 py-4 font-mono text-xs">
              <p class="text-purple-800 text-[10px] uppercase tracking-widest mb-2 px-1">explorer</p>

              <div class="space-y-0.5">
                <a href="/" class="flex items-center gap-1.5 px-2 py-1 rounded text-violet-400 hover:text-purple-300 hover:bg-purple-900/20 transition-colors">
                  <span class="text-purple-700">~/</span>home.ex
                </a>
                <a href="/about" class="flex items-center gap-1.5 px-2 py-1 rounded text-violet-400 hover:text-purple-300 hover:bg-purple-900/20 transition-colors">
                  <span class="text-purple-700">~/</span>about.ex
                </a>
              </div>

              <div class="mt-4">
                <p class="text-purple-700 px-2 mb-1">_posts/</p>
                <div class="space-y-0.5 pl-2">
                  <%= for post <- @nav_posts do %>
                    <a href="<%= post[:permalink] %>" class="flex items-start gap-1 px-2 py-1 rounded text-violet-500 hover:text-purple-300 hover:bg-purple-900/20 transition-colors leading-snug">
                      <span class="text-purple-800 shrink-0 mt-0.5">└</span>
                      <span class="break-all"><%= post[:title] |> String.slice(0, 28) %><%= if String.length(post[:title] || "") > 28, do: "…" %></span>
                    </a>
                  <% end %>
                </div>
              </div>
            </nav>

            <%# Sidebar footer %>
            <div class="px-4 py-4 border-t border-purple-900/30 font-mono text-[10px] text-purple-800">
              <a href="https://github.com/rockneurotiko" class="hover:text-purple-400 transition-colors block mb-1">github/rockneurotiko</a>
              <a href="https://telegram.me/rockneurotiko" class="hover:text-purple-400 transition-colors block">telegram/rockneurotiko</a>
            </div>
          </aside>

          <%# Main content %>
          <main class="flex-1 md:ml-56 px-6 py-10 max-w-3xl">
            <%= render @inner_content %>
          </main>
        </div>

        <%= if Mix.env() == :dev do Tableau.live_reload(assigns) end %>
      </body>
    </html>
    """
  end
end
