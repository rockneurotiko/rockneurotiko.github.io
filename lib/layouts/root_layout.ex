defmodule Rock.RootLayout do
  use Tableau.Layout, layout: nil
  import Rock

  def template(assigns) do
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
      <body class="bg-gray-950 text-gray-300 antialiased min-h-screen flex flex-col">

        <header class="sticky top-0 z-50 bg-gray-950 border-b border-cyan-900/50 shadow-[0_1px_0_0_rgba(6,182,212,0.15)]">
          <div class="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" class="font-mono font-bold text-white text-sm tracking-tight hover:text-cyan-300 transition-colors neon-text">&gt; rock_neurotiko</a>
            <nav class="flex items-center gap-1 font-mono text-xs">
              <a href="/" class="px-3 py-1.5 rounded text-gray-400 hover:text-cyan-300 hover:bg-cyan-950/50 transition-all duration-150">/home</a>
              <a href="/about" class="px-3 py-1.5 rounded text-gray-400 hover:text-cyan-300 hover:bg-cyan-950/50 transition-all duration-150">/about</a>
            </nav>
          </div>
        </header>

        <main class="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
          <%= render @inner_content %>
        </main>

        <footer class="border-t border-cyan-900/30 mt-8">
          <div class="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between font-mono text-xs text-gray-600">
            <span>// rock neurotiko · madrid</span>
            <div class="flex gap-4">
              <a href="https://github.com/rockneurotiko" class="hover:text-cyan-400 transition-colors">github</a>
              <a href="https://telegram.me/rockneurotiko" class="hover:text-cyan-400 transition-colors">telegram</a>
            </div>
          </div>
        </footer>

        <%= if Mix.env() == :dev do Tableau.live_reload(assigns) end %>
      </body>
    </html>
    """
  end
end
