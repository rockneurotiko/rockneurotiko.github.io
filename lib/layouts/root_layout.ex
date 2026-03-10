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
      <body class="bg-white text-gray-900 antialiased min-h-screen">
        <header class="border-b border-gray-100">
          <div class="max-w-2xl mx-auto px-6 py-5 flex justify-between items-center">
            <a href="/" class="font-bold text-lg tracking-tight text-gray-900 hover:text-gray-600 transition-colors" style="font-family: Georgia, serif;">rock</a>
            <nav class="flex gap-6 text-sm text-gray-500">
              <a href="/" class="hover:text-gray-900 transition-colors">home</a>
              <a href="/about" class="hover:text-gray-900 transition-colors">about</a>
            </nav>
          </div>
        </header>
        <main class="max-w-2xl mx-auto px-6 py-12">
          <%= render @inner_content %>
        </main>
        <footer class="border-t border-gray-100 mt-16">
          <div class="max-w-2xl mx-auto px-6 py-8 flex justify-between items-center text-sm text-gray-400">
            <span>rock neurotiko</span>
            <div class="flex gap-4">
              <a href="https://github.com/rockneurotiko" class="hover:text-gray-700 transition-colors">github</a>
              <a href="https://telegram.me/rockneurotiko" class="hover:text-gray-700 transition-colors">telegram</a>
            </div>
          </div>
        </footer>
        <%= if Mix.env() == :dev do Tableau.live_reload(assigns) end %>
      </body>
    </html>
    """
  end
end
