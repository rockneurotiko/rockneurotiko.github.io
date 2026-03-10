defmodule Rock.RootLayout do
  use Tableau.Layout
  import Rock

  def template(assigns) do
    ~H"""
    <!DOCTYPE html>

    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta http_equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <title>
          <%= [@page[:title], "rock"]
              |> Enum.filter(& &1)
              |> Enum.intersperse("|")
              |> Enum.join(" ") %>
        </title>

        <link rel="stylesheet" href="/css/site.css" />
        <script src="/js/site.js"></script>
      </head>

      <body>
        <main>
          <%= render @inner_content %>
        </main>
      </body>

      <%= if Mix.env() == :dev do %>
        <%= Tableau.live_reload(assigns) %>
      <% end %>
    </html>
    """
  end
end

