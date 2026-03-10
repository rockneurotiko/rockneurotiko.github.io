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
      <body class="bg-[#0a0f0a] text-[#4ade80] antialiased min-h-screen flex flex-col scanlines" style="font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;">
        <header class="border-b border-[#166534]">
          <div class="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
            <a href="/" class="font-bold text-[#4ade80] hover:text-[#86efac] transition-colors text-sm">
              <span class="text-[#166534]">rock@blog</span><span class="text-[#6b7280]">:</span><span class="text-[#60a5fa]">~</span><span class="text-[#6b7280]">$</span>
              <span class="ml-2 cursor-blink">_</span>
            </a>
            <nav class="flex gap-6 text-xs text-[#166534]">
              <a href="/" class="hover:text-[#4ade80] transition-colors">./home</a>
              <a href="/about" class="hover:text-[#4ade80] transition-colors">./about</a>
            </nav>
          </div>
        </header>
        <main class="max-w-3xl mx-auto px-6 py-10 flex-1 w-full">
          <%= render @inner_content %>
        </main>
        <footer class="border-t border-[#166534] mt-8">
          <div class="max-w-3xl mx-auto px-6 py-5 flex justify-between items-center text-xs text-[#166534]">
            <span>[process exited with code 0]</span>
            <div class="flex gap-4">
              <a href="https://github.com/rockneurotiko" class="hover:text-[#4ade80] transition-colors">github</a>
              <a href="https://telegram.me/rockneurotiko" class="hover:text-[#4ade80] transition-colors">telegram</a>
            </div>
          </div>
        </footer>
        <%= if Mix.env() == :dev do Tableau.live_reload(assigns) end %>
      </body>
    </html>
    """
  end
end
