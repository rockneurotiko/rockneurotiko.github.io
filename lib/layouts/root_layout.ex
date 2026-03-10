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
        <link rel="stylesheet" href="/css/site.css" />
      </head>
      <body class="bg-stone-50 text-stone-800 antialiased min-h-screen flex flex-col">
        <header class="bg-white border-b border-stone-200">
          <div class="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
            <a href="/" class="font-bold text-lg text-stone-900 hover:text-teal-600 transition-colors tracking-tight">rock neurotiko</a>
            <nav class="flex gap-1">
              <a href="/" class="text-stone-500 hover:text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Home</a>
              <a href="/about" class="text-stone-500 hover:text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">About</a>
            </nav>
          </div>
        </header>
        <main class="max-w-2xl mx-auto px-6 py-12 flex-1 w-full">
          <%= render @inner_content %>
        </main>
        <footer class="border-t border-stone-200 bg-white mt-16">
          <div class="max-w-2xl mx-auto px-6 py-8 text-center text-sm text-stone-400">
            <p>Thanks for reading &mdash; made with care in Madrid</p>
            <div class="flex justify-center gap-4 mt-3">
              <a href="https://github.com/rockneurotiko" class="hover:text-teal-600 transition-colors">GitHub</a>
              <a href="https://telegram.me/rockneurotiko" class="hover:text-teal-600 transition-colors">Telegram</a>
            </div>
          </div>
        </footer>
        <%= if Mix.env() == :dev do Tableau.live_reload(assigns) end %>
      </body>
    </html>
    """
  end
end
