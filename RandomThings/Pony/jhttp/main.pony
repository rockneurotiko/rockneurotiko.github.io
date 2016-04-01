use "net/http"
use "collections"

actor Main
  new create(env: Env) =>
    let serv: HttpServer = HttpServer(env)
    serv.add_handler("/", RootHandler)
    serv.start_server()

primitive RootHandler
  fun val apply(request: Payload) =>
    let response = Payload.response()
    response.add_chunk("You asked for ")
    response.add_chunk(request.url.path)

    if request.url.query.size() > 0 then
      response.add_chunk("?")
      response.add_chunk(request.url.query)
    end

    if request.url.fragment.size() > 0 then
      response.add_chunk("#")
      response.add_chunk(request.url.fragment)
    end

    (consume request).respond(consume response)
