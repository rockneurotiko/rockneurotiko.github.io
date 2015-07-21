use "collections"

class JsHelper
 fun empty_and_finish(r: String, st: String, en: String, tabs: String): String =>
   var res = r
   if res.substring(-2, -1) != st then
     res = res.cut(-2, -2)
     res = res + tabs + en
   else // Empty
     res = res.cut(-1, -1)
     res = res + en
   end
   res

 fun ntabs(n: U64, ns: U64 = 2, start: Bool = false): String =>
   if start then
     ""
   else
     var s = ""
     for j in Range[U64](0, ns) do
       s = s + " "
     end
     var x = ""
     for i in Range[U64](0, n) do
       x = x + s
     end
    x
   end
