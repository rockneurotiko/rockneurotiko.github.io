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
        <style>
          /* Hide topbar brand+toggle when sidebar checkbox is checked */
          #sb-toggle:checked ~ div #topbar-collapsed { display: none; }
        </style>
        <script>
          (function() {
            var t = localStorage.getItem('theme');
            if (t) document.documentElement.setAttribute('data-theme', t);
          })();
        </script>
      </head>
      <body style="background-color: var(--bg); color: var(--text-base);" class="antialiased min-h-screen font-mono">

        <%!-- Mobile top bar --%>
        <header style="background-color: var(--bg-sidebar); border-color: var(--border);" class="md:hidden border-b px-4 py-3 flex justify-between items-center sticky top-0 z-40">
          <a href="/" style="color: var(--nav-active);" class="font-mono font-bold text-sm">rock |&gt; neurotiko</a>
          <nav class="flex gap-4 items-center text-xs font-mono">
            <a href="/" style="color: var(--nav-dim);" class="hover:opacity-80 transition-opacity">~/home</a>
            <a href="/about" style="color: var(--nav-dim);" class="hover:opacity-80 transition-opacity">~/about</a>
            <button onclick="toggleTheme()" style="color: var(--nav-dim);" class="hover:opacity-80 transition-opacity cursor-pointer" title="Toggle theme" aria-label="Toggle theme">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </button>
            <a href="https://github.com/rockneurotiko" style="color: var(--nav-dim);" class="hover:opacity-80 transition-opacity" title="GitHub" target="_blank" rel="noopener">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </a>
          </nav>
        </header>

        <%!-- Sidebar toggle checkbox — must be a sibling of both sidebar and main content --%>
        <input type="checkbox" id="sb-toggle" class="peer/sidebar sr-only" checked />

        <%!-- Desktop sidebar — direct sibling of input, peer-checked works via CSS ~ --%>
        <aside style="background-color: var(--bg-sidebar); border-color: var(--border);"
               class="hidden md:flex flex-col fixed inset-y-0 left-0 z-30 overflow-hidden transition-all duration-300 border-r
                      w-0 peer-checked/sidebar:w-60">

          <%!-- Inner wrapper keeps content at fixed width so it doesn't reflow --%>
          <div class="flex flex-col h-full w-60 overflow-y-auto scrollbar-sidebar">

            <%!-- Brand + collapse button --%>
            <div style="border-color: var(--border-subtle);" class="px-4 pt-5 pb-4 border-b flex items-start justify-between shrink-0">
              <div>
                <a href="/" style="color: var(--nav-active);" class="block font-mono font-bold text-sm leading-tight hover:opacity-80 transition-opacity">
                  rock |&gt; neurotiko
                </a>
                <p style="color: var(--nav-label);" class="font-mono text-xs mt-1">mix run --blog</p>
              </div>
              <label for="sb-toggle" style="color: var(--nav-dim);" class="cursor-pointer hover:opacity-80 transition-opacity mt-0.5 shrink-0" title="Collapse sidebar">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>
                </svg>
              </label>
            </div>

            <%!-- Directory tree --%>
            <nav class="flex-1 px-3 py-4 font-mono text-sm overflow-y-auto">

              <p style="color: var(--nav-label);" class="text-xs uppercase tracking-widest mb-2 px-2">explorer</p>
              <div class="space-y-0.5 mb-5">
                <a href="/" style="color: var(--text-dim);" class="flex items-center gap-1.5 px-2 py-1.5 rounded hover:opacity-80 hover:bg-white/5 transition-all duration-150 group">
                  <span style="color: var(--nav-dim);" class="group-hover:opacity-80 transition-opacity">~/</span>home.ex
                </a>
                <a href="/about" style="color: var(--text-dim);" class="flex items-center gap-1.5 px-2 py-1.5 rounded hover:opacity-80 hover:bg-white/5 transition-all duration-150 group">
                  <span style="color: var(--nav-dim);" class="group-hover:opacity-80 transition-opacity">~/</span>about.ex
                </a>
              </div>

              <%!-- Collapsible posts section --%>
              <details class="group/posts" open>
                <summary style="color: var(--accent-2);" class="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer select-none hover:opacity-80 hover:bg-white/5 transition-all duration-150 mb-1">
                  <span class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 group-open/posts:hidden" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 hidden group-open/posts:block" viewBox="0 0 24 24" fill="currentColor"><path d="M2 8a2 2 0 012-2h4l2 2h8a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8z"/></svg>
                    <span>_posts/</span>
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5 transition-transform duration-200 group-open/posts:rotate-90" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
                  </svg>
                </summary>
                <div class="space-y-0.5 pl-2">
                  <%= for post <- @nav_posts do %>
                    <a href="<%= post[:permalink] %>"
                       title="<%= post[:title] %>"
                       style="color: var(--text-dim);"
                       class="flex items-start gap-1.5 px-2 py-1.5 rounded hover:opacity-80 hover:bg-white/5 transition-all duration-150 group/post leading-snug">
                      <span style="color: var(--nav-label);" class="shrink-0 mt-0.5 group-hover/post:opacity-80 transition-opacity">└</span>
                      <span class="truncate"><%= post[:title] %></span>
                    </a>
                  <% end %>
                </div>
              </details>

            </nav>
          </div>
        </aside>

        <%!-- Main content — direct sibling of input, shifts right when sidebar open --%>
        <div class="flex flex-col min-h-screen transition-all duration-300 md:ml-0 peer-checked/sidebar:md:ml-60">

          <%!-- Desktop top bar --%>
          <div style="background-color: var(--bg); border-color: var(--border-subtle);"
               class="hidden md:flex items-center gap-3 px-6 py-3 border-b sticky top-0 z-20">
            <div id="topbar-collapsed" class="flex items-center gap-3">
              <label for="sb-toggle" style="color: var(--nav-dim);" class="cursor-pointer hover:opacity-80 transition-opacity" title="Open sidebar">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </label>
              <a href="/" style="color: var(--nav-active);" class="font-mono text-sm font-bold hover:opacity-80 transition-opacity">rock |&gt; neurotiko</a>
            </div>
            <div class="flex-1"></div>
            <button onclick="toggleTheme()" style="color: var(--nav-dim);" class="hover:opacity-80 transition-opacity cursor-pointer" title="Toggle theme" aria-label="Toggle theme">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </button>
            <a href="https://github.com/rockneurotiko" style="color: var(--nav-dim);" class="hover:opacity-80 transition-opacity" title="GitHub" target="_blank" rel="noopener">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </a>
          </div>

          <main class="flex-1 px-6 py-10 md:px-12">
            <%= render @inner_content %>
          </main>
        </div>

        <script>
          function toggleTheme() {
            var html = document.documentElement;
            var current = html.getAttribute('data-theme');
            var next = current === 'light' ? null : 'light';
            if (next) {
              html.setAttribute('data-theme', next);
              localStorage.setItem('theme', next);
            } else {
              html.removeAttribute('data-theme');
              localStorage.removeItem('theme');
            }
          }
        </script>

        <%= if Mix.env() == :dev do Tableau.live_reload(assigns) end %>
      </body>
    </html>
    """
  end
end
