use "collections"

trait JsValue is Stringable, Comparable[JsValue]

  fun pfmt(t: U64 = 0, s: U64 = 0, start: Bool = false): String =>
    Json.prettyPrint(this, t, s, start)
    // JsHelper.ntabs(t, s, start) + this.string()
  fun apply(): this -> (None | Bool | F64 | String | List[JsValue] | Map[String, JsValue])
  fun eq(x: JsValue box): Bool => false // false by default

class JsNull is JsValue
  fun string(fmt: FormatDefault = FormatDefault, prefix: NumberPrefix = PrefixDefault, prec: U64 = 1, width: U64 = 0,
    align: Align = AlignRight, fill: U32 = ' '): String iso^ =>
    "null".string()
  fun eq(x: JsValue box): Bool =>
    match x
    | var z: JsNull box => true
    else
      false
    end

  fun apply(): this -> None =>
    None

class JsBoolean is JsValue
  var value: Bool

  new create(value': Bool = false) =>
    value = value'

  fun eq(x: JsValue box): Bool =>
    match x
    | var z: JsBoolean box => value == z()
    else
      false
    end

  fun apply(): this -> Bool =>
    value

  fun string(fmt: FormatDefault = FormatDefault, prefix: NumberPrefix = PrefixDefault, prec: U64 = 1, width: U64 = 0,
    align: Align = AlignRight, fill: U32 = ' '): String iso^ =>
    value.string()

class JsNumber is JsValue
  let value: F64

  new create(value': F64 = 0) =>
    value = consume value'

  fun eq(x: JsValue box): Bool =>
    match x
    | var z: JsNumber box => value == z()
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

  fun eq(x: JsValue box): Bool =>
    match x
    | var z: JsString box => value == z()
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

  // public compare with any iterator!
  fun compare(x: Iterator[JsValue]): Bool =>
    var i: U64 = 0
    for v2 in x do
      try
        let v1 = getn(i)
        i = i + 1
        if v1 != v2 then
          return false
        end
      else
        return false
      end
    end
    if size() > i then
      return false
    end
    true

  fun _cmp_jsarray(x: JsArray box): Bool =>
    // use compare? :S
    if size() != x.size() then
      return false
    end
    for i in Range(0, size()) do
      try
        let v1 = getn(i)
        let v2 = x.getn(i)
        if v1 != v2 then
          return false
        end
      else
        return false
      end
    end
    true

  fun eq(x: JsValue box): Bool =>
    match x
    | var z: JsArray box =>
      true
      _cmp_jsarray(z)
    else
      false
    end

  // fun find_remove(x: Array[JsValue], v: JsValue) =>
  //   true

  fun getn(i: U64 = 0): this->JsValue ? =>
    value(i)

  // Safe add, don't mutate, just return the a new one
  fun ref add(x: JsArray): JsArray =>
    let newjsarray = JsArray
    for v in values() do
      newjsarray.push(v)
    end
    for v2 in x.values() do
      newjsarray.push(v2)
    end
    newjsarray

  fun ref append_list(x: List[JsValue]) =>
    value.append_list(x)

  fun ref push(a: JsValue): JsArray =>
    value.push(a)
    this

  fun size(): U64 =>
    value.size()

  fun values(): ListValues[JsValue, this->ListNode[JsValue]]^=>
    value.values()

  fun pfmt(n: U64 = 0, ns: U64 = 2, start: Bool = false): String =>
    Json.prettyPrint(this, n, ns, start)
    // var res = JsHelper.ntabs(n, ns, start) + "[\n"

    // let nn = n + 1
    // for i in value.values() do
    //   res = res + i.pfmt(nn, ns) + ",\n"
    // end
    // JsHelper.empty_and_finish(res, "[\n", "]", JsHelper.ntabs(n, ns))

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

  fun eq(x: JsValue box): Bool => true // TODO

  fun get(key: String): this -> JsValue ? =>
    value(key)

  fun ref append(key: String, value': JsValue): JsObject =>
    value.update(key, value')
    this

  fun ref sappend(key: String, value': JsValue): JsValue =>
    try
      value.insert(key, value')
    else
      // according to Map.insert, this is unreachable
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
    Json.prettyPrint(this, n, ns, start)
    // var res = JsHelper.ntabs(n, ns, start) + "{\n"
    // let nn = n + 1
    // for (k, v) in pairs() do
    //   res = res + JsHelper.ntabs(nn, ns) + "\"" + k +"\": " + v.pfmt(nn, ns, true) + ",\n"
    // end
    // JsHelper.empty_and_finish(res, "{\n", "}", JsHelper.ntabs(n, ns))

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
