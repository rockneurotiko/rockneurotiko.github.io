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
      <body class="bg-white text-gray-900 antialiased min-h-screen flex flex-col">
        <header class="bg-indigo-700 text-white sticky top-0 z-50 shadow-md">
          <div class="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
            <a href="/" class="text-xl font-bold tracking-tight text-white no-underline hover:text-indigo-200 transition-colors">
              Rock Neurotiko
            </a>
            <nav class="flex gap-6 text-sm font-medium text-indigo-200">
              <a href="/" class="hover:text-white transition-colors">Home</a>
              <a href="/about" class="hover:text-white transition-colors">About</a>
            </nav>
          </div>
        </header>
        <main class="flex-1">
          <%= render @inner_content %>
        </main>
        <footer class="bg-gray-900 text-gray-400 mt-16 border-t-4 border-indigo-600">
          <div class="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div class="text-white font-bold mb-1">Rock Neurotiko</div>
              <div class="text-sm">Software engineer in Madrid</div>
            </div>
            <div class="text-sm flex gap-6">
              <a href="https://github.com/rockneurotiko" class="hover:text-white transition-colors">GitHub</a>
              <a href="https://telegram.me/rockneurotiko" class="hover:text-white transition-colors">Telegram</a>
            </div>
          </div>
          <div class="max-w-4xl mx-auto px-6 pb-6 text-xs text-gray-600">
            Built with <span class="text-indigo-400">Tableau</span> &amp; <span class="text-indigo-400">Elixir</span>
          </div>
        </footer>
        <%= Tableau.live_reload(assigns) %>
      </body>
    </html>
    """
  end
end
