use "net/http"
use "collections"

class HttpServer
  let _env: Env
  let _paths: Map[String, RequestHandler]

  new create(env: Env) => //, paths: Map[String, RequestHandler] val = Map[String, RequestHandler]) =>
    _env = env
    _paths = _paths.create()// Map[String, RequestHandler]

  fun ref add_handler(path: String, handl: RequestHandler) =>
    _paths(path) = handl

  fun start_server(host: String = "", service: String = "9711", limit: U64 = 100) =>
    // Choose log
    Server(HttpConnect(_env), HttpGeneralHandle(_env, _paths), CommonLog(_env.out) where host=host, service=service, limit=limit)


class HttpGeneralHandle is RequestHandler
  let _env: Env
  let _paths: Map[String, RequestHandler]

  new create(env: Env, paths: Map[String, RequestHandler]) =>
    _env = env
    _paths = consume paths

  fun val apply(request: Payload) =>
    let path = request.url.path
    for (p, h) in _paths.pairs() do
      if p == path then
        h(request)
      end
    end
    // let response = Payload.response()
    // response.add_chunk("You asked for ")
    // response.add_chunk(request.url.path)

    // if request.url.query.size() > 0 then
    //   response.add_chunk("?")
    //   response.add_chunk(request.url.query)
    // end

    // if request.url.fragment.size() > 0 then
    //   response.add_chunk("#")
    //   response.add_chunk(request.url.fragment)
    // end

    // (consume request).respond(consume response)


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
