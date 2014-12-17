import Data.List
import Data.Char
import Unsafe.Coerce

data Nat = Zero
         | Succ Nat
         deriving Show

-- Ej. 1

natToInteger :: Nat -> Integer
natToInteger Zero = 0
natToInteger (Succ n) = natToInteger n + 1

natToInteger2 :: Nat -> Integer
natToInteger2 (Succ n) = natToInteger2 n + 1
natToInteger2 Zero = 0

natToInteger3 :: Nat -> Integer
natToInteger3 (Succ n) = 1 + natToInteger3 n
natToInteger3 Zero = 0

natToInteger4 :: Nat -> Integer
natToInteger4 Zero = 1
natToInteger4 (Succ n) = (1 + natToInteger4 n) - 1

natToInteger5 :: Nat -> Integer
natToInteger5 = head . m
    where m Zero = [0]
          m (Succ n) =  [sum [x | x <- (1 : m n)]]

natToInteger6 :: Nat -> Integer
natToInteger6 = \n -> genericLength [c | c <- show n, c == 'S']

-- Ej 2

-- Need to execute GHCI with -XNPlusKPatterns

integerToNat :: Integer -> Nat
integerToNat (n+1) = (Succ (integerToNat n))
integerToNat 0 = Zero

integerToNat2 :: Integer -> Nat
integerToNat2 (n+1) = let m = integerToNat2 n in Succ m
integerToNat2 0 = Zero

-- Ej 3

add :: Nat -> Nat -> Nat
add Zero n = n
add (Succ m) n = Succ (add m n)

mult :: Nat -> Nat -> Nat
mult m Zero = Zero
mult m (Succ n) = add m (mult m n)


data Tree = Leaf Integer
          | Node Tree Integer Tree

occurs :: Integer -> Tree -> Bool
occurs m (Leaf n) = m == n
occurs m (Node l n r)
    = case compare m n of
        LT -> occurs m l
        EQ -> True
        GT -> occurs m r

occurs' m (Leaf n) = m == n
occurs' m (Node l n r)
    | m == n = True
    | m < n = occurs' m l
    | otherwise = occurs' m r


data Tree2 = Leaf2 Integer
           | Node2 Tree2 Tree2
           deriving Show


leaves (Leaf2 x) = x
leaves (Node2 l r) = leaves l + leaves r
balanced :: Tree2 -> Bool
balanced (Leaf2 _) = True
balanced (Node2 l r) = abs (leaves l - leaves r) <= 1 && balanced l && balanced r


halve xs = splitAt (length xs `div` 2) xs
balance :: [Integer] -> Tree2
balance [x] = Leaf2 x
balance xs = Node2 (balance ys) (balance zs)
    where (ys, zs) = halve xs


btree = (Node2 (Node2 (Node2 (Leaf2 0) (Leaf2 1)) (Leaf2 2)) (Node2 (Leaf2 3) (Leaf2 4)))
nbtree = (Node2 (Node2 (Node2 (Leaf2 0) (Leaf2 1)) (Leaf2 2)) (Leaf2 3))
tree = (Node (Node (Leaf 1) 3 (Node (Leaf 4) 6 (Leaf 7))) 8 (Node (Leaf 13) 10 (Leaf 14)))

