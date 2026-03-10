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
      <body class="bg-stone-50 text-stone-800 antialiased min-h-screen flex flex-col">
        <header class="bg-stone-50 border-b border-stone-200">
          <div class="max-w-2xl mx-auto px-6 py-4">
            <div class="flex justify-between items-center bg-white border border-stone-200 rounded-2xl px-5 py-3 shadow-sm">
              <a href="/" class="text-base font-semibold text-stone-800 no-underline hover:text-teal-700 transition-colors">
                rock neurotiko
              </a>
              <nav class="flex gap-5 text-sm text-stone-500">
                <a href="/" class="hover:text-teal-700 transition-colors font-medium">Home</a>
                <a href="/about" class="hover:text-teal-700 transition-colors font-medium">About</a>
              </nav>
            </div>
          </div>
        </header>
        <main class="flex-1">
          <%= render @inner_content %>
        </main>
        <footer class="mt-16 border-t border-stone-200 bg-white">
          <div class="max-w-2xl mx-auto px-6 py-6 text-center text-sm text-stone-400">
            <p class="mb-1">Thanks for reading</p>
            <div class="flex justify-center gap-4 mt-2">
              <a href="https://github.com/rockneurotiko" class="hover:text-teal-600 transition-colors">GitHub</a>
              <span class="text-stone-300">&middot;</span>
              <a href="https://telegram.me/rockneurotiko" class="hover:text-teal-600 transition-colors">Telegram</a>
            </div>
          </div>
        </footer>
        <%= Tableau.live_reload(assigns) %>
      </body>
    </html>
    """
  end
end
