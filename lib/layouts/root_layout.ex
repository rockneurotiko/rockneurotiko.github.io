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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/css/site.css" />
      </head>
      <body class="bg-white text-gray-900 antialiased min-h-screen flex flex-col" style="font-family: 'Inter', system-ui, sans-serif;">
        <header class="bg-indigo-600 sticky top-0 z-10 shadow-md">
          <div class="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
            <a href="/" class="font-extrabold text-xl text-white tracking-tight hover:text-indigo-200 transition-colors">rock neurotiko</a>
            <nav class="flex gap-1">
              <a href="/" class="text-indigo-200 hover:text-white hover:bg-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors">Home</a>
              <a href="/about" class="text-indigo-200 hover:text-white hover:bg-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors">About</a>
            </nav>
          </div>
        </header>
        <main class="flex-1">
          <%= render @inner_content %>
        </main>
        <footer class="bg-gray-900 text-gray-400 mt-16">
          <div class="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-2 sm:flex-row sm:justify-between items-center text-sm">
            <span class="text-gray-500">Built with <span class="text-indigo-400">Tableau</span> &amp; Elixir</span>
            <div class="flex gap-4">
              <a href="https://github.com/rockneurotiko" class="hover:text-white transition-colors">GitHub</a>
              <a href="https://telegram.me/rockneurotiko" class="hover:text-white transition-colors">Telegram</a>
            </div>
          </div>
        </footer>
        <%= if Mix.env() == :dev do Tableau.live_reload(assigns) end %>
      </body>
    </html>
    """
  end
end
