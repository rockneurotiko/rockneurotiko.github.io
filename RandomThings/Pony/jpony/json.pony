class Json
 fun prettyPrint(js: JsValue box, n: U64 = 0, ns: U64 = 2, start: Bool = false): String =>
   match js
   | let x: JsArray box =>
     var res = JsHelper.ntabs(n, ns, start) + "[\n"
     for i in x.values() do
       res = res + prettyPrint(i, n + 1, ns) + ",\n"
     end
     JsHelper.empty_and_finish(res, "[\n", "]", JsHelper.ntabs(n, ns))
   | let x: JsObject box =>
     var res = JsHelper.ntabs(n, ns, start) + "{\n"
     for (k, v) in x.pairs() do
       res = res + JsHelper.ntabs(n + 1, ns) + "\"" + k +"\": " + prettyPrint(v, n + 1, ns, true) + ",\n"
     end
     JsHelper.empty_and_finish(res, "{\n", "}", JsHelper.ntabs(n, ns))
   else
     JsHelper.ntabs(n, ns, start) + js.string()
   end
