use "net/http"
use "collections"

// MAIN
actor Main
  new create(env: Env) =>
    let serv: HttpServer = HttpServer(env)
    serv.set_handler(TestPassHandler)
    serv.start_server()

primitive TestPassHandler
  fun val apply(request: Payload) =>
    let response = Payload.response()
    response.add_chunk("(From TestPassHandler) You asked for ")
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



// CLASSES
class HttpServer
  let _env: Env
  let paths: Map[String, RequestHandler]
  var handler: RequestHandler

  new create(env: Env) =>
    _env = env
    paths = Map[String, RequestHandler]
    handler = HttpGeneralHandler(env, paths)

  fun ref set_handler(handler': RequestHandler) =>
    handler = handler'

  fun ref set_p_handler(path: String, handl: RequestHandler) =>
    paths(path) = handl

  fun start_server(host: String = "", service: String = "50000", limit: U64 = 100) =>
    // Choose log
    Server(HttpConnect(_env), handler, CommonLog(_env.out) where host=host, service=service, limit=limit)


class HttpGeneralHandler is RequestHandler
  let _env: Env
  let paths: Map[String, RequestHandler]

  new val create(env: Env, paths': Map[String, RequestHandler]) =>
    _env = env
    paths = paths'

  fun val apply(request: Payload) =>
    let path = request.url.path
    _env.out.print("Asked for path: " + path)
    let response = Payload.response()
    response.add_chunk("You asked for ")
    response.add_chunk(request.url.path)

    (consume request).respond(consume response)


class HttpConnect
  let _env: Env

  new iso create(env: Env) =>
    _env = env

  fun ref listening(server: Server ref) =>
    try
      (let host, let service) = server.local_address().name()
      _env.out.print("Listening on " + host + ":" + service)
    else
      _env.out.print("Couldn't get local address.")
      server.dispose()
    end

  fun ref not_listening(server: Server ref) =>
    _env.out.print("Failed to listen.")

  fun ref closed(server: Server ref) =>
    _env.out.print("Shutdown.")
