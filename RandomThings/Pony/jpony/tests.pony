use "ponytest"
use "collections"

actor Main
  new create(env: Env) =>
    var test = PonyTest(env)
    test(recover _TestJsNull end)
    test(recover _TestJsBoolean end)
    test(recover _TestJsNumber end)
    test(recover _TestJsString end)
    test(recover _TestJsArray end)
    test(recover _TestJsObject end)
    test(recover _TestCrossJsValues end)
    recover OtherMain(env) end
    test.complete()

class _TestJsNull iso is UnitTest
  fun name(): String => "JsNull"
  fun apply(h: TestHelper): TestResult =>
    // test instances
    let jsnull = JsNull
    // Value tests
    h.expect_eq[None](None, jsnull())
    // Equivalence tests
    h.expect_eq[JsValue](JsNull, jsnull)
    h.expect_eq[String](JsNull.string(), jsnull.string())
    // Representation tests
    h.expect_eq[String]("null", jsnull.string())
    true

class _TestJsBoolean iso is UnitTest
  fun name(): String => "JsBoolean"
  fun apply(h: TestHelper): TestResult =>
    // test instances
    let jsbooltrue = JsBoolean(true)
    let jsboolfalse = JsBoolean(false)
    // Value tests
    h.expect_eq[Bool](true, jsbooltrue())
    h.expect_eq[Bool](false, jsboolfalse())
    // Equivalence tests
    h.expect_eq[JsValue](jsbooltrue, JsBoolean(true))
    h.expect_eq[JsValue](jsboolfalse, JsBoolean(false))
    h.expect_true(jsbooltrue == JsBoolean(true))
    h.expect_true(jsbooltrue != jsboolfalse)
    // Representation tests
    h.expect_eq[String]("true", jsbooltrue.string())
    h.expect_eq[String]("false", jsboolfalse.string())
    true

class _TestJsNumber iso is UnitTest
  fun name(): String => "JsNumber"
  fun apply(h: TestHelper): TestResult =>
    // test instances
    let js0 = JsNumber(0)
    let jsintpos = JsNumber(97)
    let jsintneg = JsNumber(-11)
    let jsfloatpos = JsNumber(999.711)
    let jsfloatneg = JsNumber(-999.711)
    // Value tests
    h.expect_eq[F64](0, js0())
    h.expect_eq[F64](97, jsintpos())
    h.expect_eq[F64](-11, jsintneg())
    h.expect_eq[F64](999.711, jsfloatpos())
    h.expect_eq[F64](-999.711, jsfloatneg())
    // Equivalence tests
    h.expect_eq[JsValue](jsfloatpos, JsNumber(999.711))
    h.expect_ne[JsValue](jsfloatpos, JsNumber(999))
    h.expect_true((jsintpos() * -1) != jsintpos())
    h.expect_true((jsfloatpos() * -1) == jsfloatneg())
    // Representation tests
    h.expect_eq[String]("0", js0.string())
    h.expect_eq[String]("97", jsintpos.string())
    h.expect_eq[String]("-11", jsintneg.string())
    h.expect_eq[String]("999.711", jsfloatpos.string())
    h.expect_eq[String]("-999.711", jsfloatneg.string())
    true


class _TestJsString iso is UnitTest
  fun name(): String => "JsString"
  fun apply(h: TestHelper): TestResult =>
    // test instances
    let jsempty = JsString("")
    let jsstr = JsString("Just a test")
    // Value tests
    h.expect_eq[String]("", jsempty())
    h.expect_eq[String]("Just a test", jsstr())
    // Equivalence tests
    h.expect_eq[JsValue](jsempty, JsString(""))
    h.expect_ne[JsValue](jsempty, jsstr)
    // // Representation tests
    h.expect_eq[String]("\"\"", jsempty.string())  // json string formatted
    h.expect_eq[String]("\"Just a test\"", jsstr.string())
    true


class _TestJsArray iso is UnitTest
  fun name(): String => "JsArray"

  fun cmpl(x: JsArray, y: Array[JsValue]): Bool =>
    x.compare(y.values())

  fun apply(h: TestHelper): TestResult =>
    // test instances
    let jsempty = JsArray
    let jssimple = JsArray
    jssimple.push(JsNull)
    let jsinternal = JsArray
    let tmp = JsArray
    tmp.push(JsBoolean(true))
    jsinternal.push(JsNumber(97))
    jsinternal.push(tmp)
    jsinternal.push(JsString("11"))
    // This has to be done because there are not contravariance yet
    let jsnull: JsValue = JsNull
    let jsbool: JsValue = JsBoolean(true)
    let jsnum: JsValue = JsNumber(97)
    let jsstr: JsValue = JsString("11")
    let array: Array[JsValue] = [jsnull, jsbool, jsnum, jsstr]
    let jsfromarray = JsArray(array)
    // Value tests
    h.expect_true(cmpl(jsempty, Array[JsValue]))
    h.expect_true(cmpl(jssimple, [jsnull]))
    // There have to wrap the internal array in jsarray. There are no implicit conversion :(
    h.expect_true(cmpl(jsinternal, [jsnum, JsArray([jsbool]), jsstr]))
    h.expect_true(cmpl(jsfromarray, [jsnull, jsbool, jsnum, jsstr]))

    h.expect_false(cmpl(jssimple, [jsbool]))  // different type
    h.expect_false(cmpl(jsfromarray, [jsnull, jsbool, jsnum])) // lower size
    h.expect_false(cmpl(jsfromarray, [jsnull, jsbool, jsstr, jsnum]))  // unorder
    h.expect_false(cmpl(jsfromarray, [jsnull, jsbool, jsnum, jsstr, jsstr])) // one more
    // Equivalence tests
    h.expect_eq[JsValue](jsempty, jsempty)
    h.expect_eq[JsValue](jssimple, jssimple)
    h.expect_eq[JsValue](jsinternal, jsinternal)
    h.expect_eq[JsValue](jsfromarray, jsfromarray)

    h.expect_ne[JsValue](jsempty, jssimple)
    h.expect_ne[JsValue](jssimple, jsinternal)
    h.expect_ne[JsValue](jsinternal, jsfromarray)
    h.expect_ne[JsValue](jssimple, jsfromarray)
    // // Representation tests
    h.expect_eq[String]("[]", jsempty.string())
    h.expect_eq[String]("[null]", jssimple.string())
    h.expect_eq[String]("[97,[true],\"11\"]", jsinternal.string())
    h.expect_eq[String]("[null,true,97,\"11\"]", jsfromarray.string())
    true


class _TestJsObject iso is UnitTest
  fun name(): String => "JsObject"

  fun apply(h: TestHelper): TestResult =>
    // // test instances
    // let jsempty = JsArray
    // let jssimple = JsArray
    // jssimple.push(JsNull)
    // let jsinternal = JsArray
    // let tmp = JsArray
    // tmp.push(JsBoolean(true))
    // jsinternal.push(JsNumber(97))
    // jsinternal.push(tmp)
    // jsinternal.push(JsString("11"))
    // // This has to be done because there are not contravariance yet
    // let jsnull: JsValue = JsNull
    // let jsbool: JsValue = JsBoolean(true)
    // let jsnum: JsValue = JsNumber(97)
    // let jsstr: JsValue = JsString("11")
    // let array: Array[JsValue] = [jsnull, jsbool, jsnum, jsstr]
    // let jsfromarray = JsArray(array)
    // // Value tests
    // h.expect_true(cmpl(jsempty, Array[JsValue]))
    // h.expect_true(cmpl(jssimple, [jsnull]))
    // // There have to wrap the internal array in jsarray. There are no implicit conversion :(
    // h.expect_true(cmpl(jsinternal, [jsnum, JsArray([jsbool]), jsstr]))
    // h.expect_true(cmpl(jsfromarray, [jsnull, jsbool, jsnum, jsstr]))

    // h.expect_false(cmpl(jssimple, [jsbool]))  // different type
    // h.expect_false(cmpl(jsfromarray, [jsnull, jsbool, jsnum])) // lower size
    // h.expect_false(cmpl(jsfromarray, [jsnull, jsbool, jsstr, jsnum]))  // unorder
    // h.expect_false(cmpl(jsfromarray, [jsnull, jsbool, jsnum, jsstr, jsstr])) // one more
    // // Equivalence tests
    // h.expect_eq[JsValue](jsempty, jsempty)
    // h.expect_eq[JsValue](jssimple, jssimple)
    // h.expect_eq[JsValue](jsinternal, jsinternal)
    // h.expect_eq[JsValue](jsfromarray, jsfromarray)

    // h.expect_ne[JsValue](jsempty, jssimple)
    // h.expect_ne[JsValue](jssimple, jsinternal)
    // h.expect_ne[JsValue](jsinternal, jsfromarray)
    // h.expect_ne[JsValue](jssimple, jsfromarray)
    // // // Representation tests
    // h.expect_eq[String]("[]", jsempty.string())
    // h.expect_eq[String]("[null]", jssimple.string())
    // h.expect_eq[String]("[97,[true],\"11\"]", jsinternal.string())
    // h.expect_eq[String]("[null,true,97,\"11\"]", jsfromarray.string())
    true


class _TestCrossJsValues iso is UnitTest
   fun name(): String => "Test cross js values equivalence"
   fun apply(h: TestHelper): TestResult =>
     let jsarray = JsArray
     jsarray.push(JsNull)
     h.expect_ne[JsValue](JsNull, JsBoolean(true))
     h.expect_ne[JsValue](JsNull, JsNumber(9711))
     h.expect_ne[JsValue](JsNull, JsString("test"))
     h.expect_ne[JsValue](JsNull, jsarray)

     h.expect_ne[JsValue](JsBoolean(false), JsNumber(-9711))
     h.expect_ne[JsValue](JsBoolean(true), JsString("true"))
     h.expect_ne[JsValue](JsBoolean(false), jsarray)

     h.expect_ne[JsValue](JsNumber(9.711), JsString("9.711"))
     h.expect_ne[JsValue](JsNumber(-97.11), jsarray)

     h.expect_ne[JsValue](JsString("[null]"), jsarray)
     h.expect_ne[String](JsString("[null]").string(), jsarray.string())

     h.expect_false(false)
     true




actor OtherMain
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

    // let test1 = JsArray([as JsValue: JsBoolean(true)])
    // pt(test1, "test")
    // pt(test1 + test1, "Test")

    let lst = List[JsValue]
    lst.push(jsarray2)
    lst.push(JsString("test"))
    let jsarray3  = JsArray(lst)
    let jsarray4 = jsarray + jsarray3 // Add two JsArrays :)

    pt(jsarray4, "Two jsarry appended")

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
    let test3 = test2 + test2inv
    let testjarray = [as JsValue: JsNull, JsNumber(9711)]
    print(Json.prettyPrint(test3))
    print(Json.prettyPrint(test2 + test2))
    print(test2.pfmt())
    print(Json.prettyPrint(test2))

    print((JsNumber(3) == JsNumber(2)).string())
    print((test2 == test2).string())
    print((test2 == test2inv).string())
    print((test2 == JsArray).string())
    print(testp(JsNumber(3)))
    print(testp(JsString("aaa")))
    print(testp(test2))
    print(testp(jsobj))
    print(test(jsobj).string())
    print(jsobj.pfmt())
    print(jsarray.pfmt())
    print(Json.prettyPrint(jsobj))
