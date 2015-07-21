actor Main
  new create(env: Env) =>
   env.out.print(fac(100).string()) 

  fun fac(n: U64): U64 =>
    match n
    | 0 => 1
    | var x: U64 => n * fac(n-1)
    else
      1
    end
