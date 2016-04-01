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


class Json
 fun pprint(js: JsValue, n: U64 = 0, ns: U64 = 2, start: Bool = false): String =>
   match js
   | let x: JsArray =>
     var res = JsHelper.ntabs(n, ns, start) + "[\n"
     for i in x.values() do
       res = res + pprint(i, n + 1, ns) + ",\n"
     end
     JsHelper.empty_and_finish(res, "[\n", "]", JsHelper.ntabs(n, ns))
   | let x: JsObject =>
     var res = JsHelper.ntabs(n, ns, start) + "{\n"
     for (k, v) in x.pairs() do
       res = res + JsHelper.ntabs(n + 1, ns) + "\"" + k +"\": " + pprint(v, n + 1, ns, true) + ",\n"
     end
     JsHelper.empty_and_finish(res, "{\n", "}", JsHelper.ntabs(n, ns))
   else
     JsHelper.ntabs(n, ns, start) + js.string()
   end


trait JsValue is Stringable
    fun pfmt(t: U64 = 0, s: U64 = 0, start: Bool = false): String => JsHelper.ntabs(t, s, start) + this.string()
    fun apply(): this -> (None | Bool | F64 | String | List[JsValue] | Map[String, JsValue])

    fun ref eq(x: JsValue): Bool

class JsNull is JsValue
  fun string(fmt: FormatDefault = FormatDefault, prefix: NumberPrefix = PrefixDefault, prec: U64 = 1, width: U64 = 0,
    align: Align = AlignRight, fill: U32 = ' '): String iso^ =>
    "null".string()
  fun ref eq(x: JsValue): Bool =>
    match x
    | var z: JsNull => true
    else
      false
    end

  fun apply(): this -> None =>
    None

class JsBoolean is JsValue
  var value: Bool

  new create(value': Bool = false) =>
    value = value'

  fun ref eq(x: JsValue): Bool =>
    match x
    | var z: JsBoolean => value == z()
    else
      false
    end

  fun apply(): this -> Bool =>
    value

  fun string(fmt: FormatDefault = FormatDefault, prefix: NumberPrefix = PrefixDefault, prec: U64 = 1, width: U64 = 0,
    align: Align = AlignRight, fill: U32 = ' '): String iso^ =>
    value.string()

// class JsNumber[A: (Real[A] box & Number) = F64] is JsValue
//   var value: A

//   new create(value': A = 0) =>
//     value = value'

//   fun ref eq(x: JsNumber): Bool =>
//     try
//       (value as F64 val) == x()
//     else
//       false
//     end

//   fun apply(): this -> A =>
//     value

//   fun string(fmt: FormatDefault = FormatDefault, prefix: NumberPrefix = PrefixDefault, prec: U64 = 1, width: U64 = 0,
//     align: Align = AlignRight, fill: U32 = ' '): String iso^ =>
//     value.string()



class JsNumber is JsValue
  let value: F64

  new create(value': F64 = 0) =>
    value = consume value'

  fun ref eq(x: JsValue): Bool =>
    match x
    | var z: JsNumber => value == z()
    else
      false
    end

  fun apply(): this -> F64 => value

  fun string(fmt: FormatDefault = FormatDefault, prefix: NumberPrefix = PrefixDefault, prec: U64 = 1, width: U64 = 0,
    align: Align = AlignRight, fill: U32 = ' '): String iso^ =>
    value.string()



class JsString is JsValue
  var value: String

  new create(value': String = "") =>
    value = value'

  fun ref eq(x: JsValue): Bool =>
    match x
    | var z: JsString => value == z()
    else
      false
    end

  fun apply(): this -> String =>
    value

  fun string(fmt: FormatDefault = FormatDefault, prefix: NumberPrefix = PrefixDefault, prec: U64 = 1, width: U64 = 0,
    align: Align = AlignRight, fill: U32 = ' '): String iso^ =>
    ("\"" + value + "\"").string()


class JsArray is JsValue
  let value: List[JsValue]
  new create(value': (List[JsValue] | Array[JsValue]) = List[JsValue]) =>
    match value'
    | var x: List[JsValue] => value = x
    | var x: Array[JsValue] =>
      value = List[JsValue]
      for v in x.values() do
        value.push(v)
      end
    else
      value = List[JsValue]
    end

  fun apply(): this->List[JsValue] =>
    value

  fun ref toarray(): Array[JsValue] =>
    let tmp = Array[JsValue]
    for i in values() do
      tmp.push(i)
    end
    tmp

  fun ref _cmp_jsarray(x: JsArray): Bool =>
    let tmp = toarray()
    for i in x.values() do
      try
        let nth = tmp.find(i)
        tmp.delete(nth)
      else
        return false
      end
    end
    if tmp.size() > 0 then
      false
    else
      true
    end

  fun ref eq(x: JsValue): Bool =>   // TODO
    match x
    | var z: JsArray =>
      _cmp_jsarray(z)
    else
      false
    end



  fun find_remove(x: Array[JsValue], v: JsValue) =>
    true


  fun getn(i: U64 = 0): this->JsValue ? =>
    value(i)

  fun ref add(x: JsArray): JsArray =>
    value.append_list(x())
    this

  fun ref push(a: JsValue): JsArray =>
    value.push(a)
    this

  fun size(): U64 =>
    value.size()

  fun values(): ListValues[JsValue, this->ListNode[JsValue]]^=>
    value.values()

  fun pfmt(n: U64 = 0, ns: U64 = 2, start: Bool = false): String =>
    var res = JsHelper.ntabs(n, ns, start) + "[\n"

    let nn = n + 1
    for i in value.values() do
      res = res + i.pfmt(nn, ns) + ",\n"
    end
    JsHelper.empty_and_finish(res, "[\n", "]", JsHelper.ntabs(n, ns))

  fun string(fmt: FormatDefault = FormatDefault, prefix: NumberPrefix = PrefixDefault, prec: U64 = 1, width: U64 = 0,
    align: Align = AlignRight, fill: U32 = ' '): String iso^ =>
    var res = "["
    for i in value.values() do
      res = res + i.string() + ","
    end
    if res.size() > 1 then
      res = res.cut(-1, -1)
    end
    res = res + "]"
    res.string()


class JsObject is JsValue
  let value: Map[String, JsValue] = Map[String, JsValue]

  new create() => this

  fun apply(): this -> Map[String, JsValue] => value

  fun ref eq(x: JsValue): Bool => true // TODO

  fun get(key: String): this -> JsValue ? =>
    value(key)

  fun ref append(key: String, value': JsValue): JsObject =>
    value.update(key, value')
    this

  fun ref sappend(key: String, value': JsValue): JsValue =>
    try
      value.insert(key, value')
    else
      JsNull
    end

  fun ref remove(key: String): Bool =>
    try
      value.remove(key)
      true
    else
      false
    end

  fun keys(): MapKeys[String, JsValue, HashEq[String], this->HashMap[String, JsValue, HashEq[String]]]^ => value.keys()

  fun values(): MapValues[String, JsValue, HashEq[String], this->HashMap[String, JsValue, HashEq[String]]]^ => value.values()

  fun pairs(): MapPairs[String, JsValue, HashEq[String], this->HashMap[String, JsValue, HashEq[String]]]^ => value.pairs()

  fun size(): U64 =>
    value.size()

  fun pfmt(n: U64 = 0, ns: U64 = 2, start: Bool = false): String =>
    var res = JsHelper.ntabs(n, ns, start) + "{\n"
    let nn = n + 1
    for (k, v) in pairs() do
      res = res + JsHelper.ntabs(nn, ns) + "\"" + k +"\": " + v.pfmt(nn, ns, true) + ",\n"
    end
    JsHelper.empty_and_finish(res, "{\n", "}", JsHelper.ntabs(n, ns))

  fun string(fmt: FormatDefault = FormatDefault, prefix: NumberPrefix = PrefixDefault, prec: U64 = 1, width: U64 = 0,
    align: Align = AlignRight, fill: U32 = ' '): String iso^ =>
    var res = "{"
    for (k, v) in value.pairs() do
      res = res + "\"" + k + "\":" + v.string() + ","
    end
    if res.size() > 1 then
      res = res.cut(-1, -1)
    end

    res = res + "}"
    res.string()


type JsType is (JsNull | JsBoolean | JsNumber | JsString | JsArray | JsObject)

actor Main
  var _env: Env
  fun print(data: Bytes) => _env.out.print(data)
  new create(env: Env) =>
    _env = env
    print("running")
    print("Test Creating")
    testcreating()
    print("End test creating")

  fun pt(t: JsValue, opt: String = "") =>
    print(opt)
    print(t.string())
    print("")

  fun testp(j: JsValue): String =>
    match (j, j())
    | (JsNull, _) => "null"
    | (JsBoolean, false) => "false"
    | (JsBoolean, true) => "true"
    | (var x: JsNumber, var v: F64) => "numbernicee: " + v.string()
    | (var x: JsNumber, _) => "number: " + x().string()
    | (var x: JsString, var v: String) => "string: " + v
    | (var x: JsArray, var v: List[JsValue]) => "array"
    | (var x: JsObject, var v: Map[String, JsValue]) => "object"
    else
      "wut"
    end

  fun test(j: JsValue): String =>
    match j
    | JsNull => "null"
    | let x: JsBoolean => "boolean[" + x.string() + "]"
    // | let x: JsNumber[F64 val] => "number[" + x.string() + "]"
    | let x: JsNumber => "number[" + x.string() + "]"
    | let x: JsString => "string[" + x.string() + "]"
    | let x: JsArray => var x2 = "array: ["
      for i in x.values() do
        x2 = x2 + test(i) + ","
      end
      x2 = x2 + "]"
      x2
    | let x: JsObject => var x2 = "obj: {"
      for (i,j2) in x.pairs() do
        x2 = x2 + "Key: " + i + " Value: " + test(j2) + ","
      end
      x2 = x2 + "}"
      x2
    else
      ""
    end

  fun testcreating() =>
    let jsnull = JsNull
    pt(jsnull, "Null type")

    let jsboolf = JsBoolean(false)
    pt(jsboolf, "Boolean with false")

    let jsboolt = JsBoolean(true)
    pt(jsboolt, "Boolean with true")

    let jsnumber0 = JsNumber(0)
    pt(jsnumber0, "number 0")

    let jsnumberpos = JsNumber(9)
    pt(jsnumberpos, "positive number")

    let jsnumberneg = JsNumber(-9)
    pt(jsnumberneg, "negative number")

    let jsnumberfpos = JsNumber(9.711)
    pt(jsnumberfpos, "positive float number")

    let jsnumberfneg = JsNumber(-9.711)
    pt(jsnumberfneg, "negative float number")

    let jsstringe = JsString("")
    pt(jsstringe, "Empty string")

    let jsstring = JsString("testing")
    pt(jsstring, "String with \"testing\"")

    let jsarray = JsArray
    pt(jsarray, "Array empty")
    jsarray.push(jsnull)
    pt(jsarray, "Array plus null")


    jsarray.push(jsboolt)
    pt(jsarray, "Array plus bool")
    jsarray.push(jsstring)
    pt(jsarray, "Array plus string")
    let jsarray2 = JsArray
    jsarray.push(jsarray2)
    pt(jsarray, "Array with other array")
    jsarray2.push(JsString("1"))
    pt(jsarray, "Becareful, because it's a pointer!")

    let lst = List[JsValue]
    lst.push(jsarray2)
    lst.push(JsString("test"))
    let jsarray3  = JsArray(lst)
    let jsarray4 = jsarray + jsarray3 // Add two JsArrays :)

    pt(jsarray, "Two jsarry appended")


    let jsobj = JsObject
    pt(jsobj, "Empty object")
    jsobj.append("test", JsNull)
    pt(jsobj)
    jsobj.append("test2", JsNumber(9711))
    jsobj.append("test3", JsString("yay"))
    jsobj.append("test4", jsarray)
    pt(jsobj)
    jsobj.remove("test")
    pt(jsobj)

    let jsobj2 = JsObject
    jsobj2.append("innerobj", JsObject)
    jsobj.append("otherobj", jsobj2)
    pt(jsobj)

    let array1: JsValue = JsNull
    let array2: JsValue = JsNumber(3)

    let array: Array[JsValue] = [array1, array2]
    let arrayinv: Array[JsValue] = [array2, array1]
    let test2 = JsArray(array)
    let test2inv = JsArray(arrayinv)
    print(Json.pprint(test2))

    print((JsNumber(3) == JsNumber(2)).string())
    print((test2 == test2).string())
    print((test2 == test2inv).string())
    print((test2 == JsArray).string())
    // print(testp(JsNumber(3)))
    // print(testp(JsString("aaa")))
    // print(testp(test2))
    // print(testp(jsobj))
    // print(test(jsobj).string())
    // print(jsobj.pfmt())
    // print(jsarray.pfmt())
    // print(Json.pprint(jsobj))
