defmodule Rock.RootLayout do
  use Tableau.Layout
  import Rock

  def template(assigns) do
    ~H"""
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title><%= Enum.join(Enum.filter([@page[:title], "rock"], & &1), " | ") %></title>
        <link rel="stylesheet" href="/css/site.css" />
        <script src="/js/site.js"></script>
      </head>
      <body class="bg-gray-950 text-emerald-400 font-mono antialiased min-h-screen flex flex-col">
        <header class="border-b border-emerald-900/50">
          <div class="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
            <a href="/" class="text-emerald-300 font-bold tracking-tight no-underline hover:text-emerald-100 transition-colors">
              <span class="text-emerald-600">rock@blog</span><span class="text-gray-500">:</span><span class="text-blue-400">~</span><span class="text-gray-500">$</span> <span class="text-emerald-300 cursor-blink">_</span>
            </a>
            <nav class="flex gap-6 text-sm text-emerald-600">
              <a href="/" class="hover:text-emerald-300 transition-colors before:content-['./']">home</a>
              <a href="/about" class="hover:text-emerald-300 transition-colors before:content-['./']">about</a>
            </nav>
          </div>
        </header>
        <main class="flex-1">
          <%= render @inner_content %>
        </main>
        <footer class="border-t border-emerald-900/50 mt-16">
          <div class="max-w-3xl mx-auto px-6 py-5 text-xs text-emerald-800 flex justify-between">
            <span>[process exited with code 0]</span>
            <span>
              <a href="https://github.com/rockneurotiko" class="hover:text-emerald-500 transition-colors">github</a>
              <span class="mx-2">|</span>
              <a href="https://telegram.me/rockneurotiko" class="hover:text-emerald-500 transition-colors">telegram</a>
            </span>
          </div>
        </footer>
        <%= Tableau.live_reload(assigns) %>
      </body>
    </html>
    """
  end
end
