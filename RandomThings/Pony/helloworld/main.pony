// primitive Nil
// class Cons[A]
//   var item: A
//   var cons: List[A]
//   new create(item': A, cons': List[A]) =>
//     item = consume item'
//     cons = consume cons'
//   fun apply(item': A, cons': List[A]) =>
//     item = item'
//     cons = cons'

// type List[A] is (Nil | Cons[A])

// class Test
//   let test2: List[U64] = Cons(1, Nil)


class Wombat
  let name: String
  var _hunger_level: U64
  var _thirst_level: U64 = 1

  new create(name': String) =>
    name = name'
    _hunger_level = 0
  new hungry(name': String, hunger': U64) =>
    name = name'
    _hunger_level = hunger'

  fun hunger(): U64 => _hunger_level
  fun ref set_hunger(to: U64 = 0): U64 => _hunger_level = to

actor Aardvark
  let name: String
  var _hunger_level: U64 = 0
  new create(name': String) =>
    name = name'
  be eat(amount: U64) =>
    _hunger_level = _hunger_level - amount.min(_hunger_level)

actor Main
  new create(env: Env) =>
    """Esto es documentacion!!!"""
    env.out.print("Hello world!")
