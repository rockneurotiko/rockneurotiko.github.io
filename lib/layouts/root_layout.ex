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
      <body class="bg-white text-gray-900 font-serif antialiased min-h-screen flex flex-col">
        <header class="border-b border-gray-200">
          <div class="max-w-2xl mx-auto px-6 py-5 flex justify-between items-baseline">
            <a href="/" class="text-lg font-semibold tracking-tight text-gray-900 no-underline hover:text-gray-600 transition-colors">rock</a>
            <nav class="flex gap-6 text-sm text-gray-500">
              <a href="/" class="hover:text-gray-900 transition-colors">home</a>
              <a href="/about" class="hover:text-gray-900 transition-colors">about</a>
            </nav>
          </div>
        </header>
        <main class="flex-1">
          <%= render @inner_content %>
        </main>
        <footer class="border-t border-gray-200 mt-16">
          <div class="max-w-2xl mx-auto px-6 py-6 text-sm text-gray-400 flex justify-between">
            <span>rock neurotiko</span>
            <span>
              <a href="https://github.com/rockneurotiko" class="hover:text-gray-600 transition-colors">github</a>
              &nbsp;&middot;&nbsp;
              <a href="https://telegram.me/rockneurotiko" class="hover:text-gray-600 transition-colors">telegram</a>
            </span>
          </div>
        </footer>
        <%= Tableau.live_reload(assigns) %>
      </body>
    </html>
    """
  end
end
