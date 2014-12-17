import Data.Eigen.Matrix
import Data.List


{-
--OLD FUNCTIONS
absM :: Matrix -> Matrix
absM m = fromList (absL (toList m))
absL :: [[Double]] -> [[Double]]
absL x = map innerAbs x
innerAbs :: [Double] -> [Double]
innerAbs x = map abs x
 Maybe build norm1
norm2L :: [[Double]] -> Double
norm2L x = norm (fromList x)
maximM :: Matrix -> Double
maximM m =  maximum $ map maximum (toList m)
calc_tol :: Matrix -> Matrix -> Double
calc_tol r l = maximM  $ absM  $ (divide_matrix_scalar r (norm r)  -  l)

div_first_scalar :: [Double] -> Double -> [Double]
div_first_scalar [] _ = []
div_first_scalar (x:xs) s = (x / s) : div_first_scalar xs s

divide_vect_scalar :: [[Double]] -> Double -> [[Double]]
divide_vect_scalar [] _ = []
divide_vect_scalar (x:xs) s =  (div_first_scalar x s) : (divide_vect_scalar xs s)

divide_matrix_scalar :: Matrix -> Double -> Matrix
divide_matrix_scalar x s = fromList $ divide_vect_scalar (toList x) s
-}



mapMatrix :: (Double -> Double) -> Matrix -> Matrix
mapMatrix f m = fromList $ mapDL f $ toList m

mapDL :: (Double->Double) -> [[Double]] -> [[Double]]
mapDL f m = map (mapL f) m

mapL :: (Double -> Double) -> [Double] -> [Double]
mapL f m = map f m

divide_matrix_scalar :: Matrix -> Double -> Matrix
divide_matrix_scalar x s = mapMatrix (/s) x

mult_matrix_scalar :: Matrix -> Double -> Matrix
mult_matrix_scalar x s = mapMatrix (*s) x

-- Used functions
calc_tol :: Matrix -> Matrix -> Double
calc_tol r l = maxCoeff  $ (mapMatrix abs)  $ (divide_matrix_scalar r (norm r)  -  l)


potencia :: Matrix -> Double -> Int -> Matrix -> (Matrix, Double, Int)
potencia m tol n_iter r = potencia' m tol n_iter r 0 (zero (cols m) 1)

potencia' :: Matrix -> Double -> Int -> Matrix -> Int -> Matrix -> (Matrix, Double, Int)
potencia' m tol n_iter r i l = case ( (calc_tol r l) > tol,i<n_iter) of
                                (True, True) ->  potencia' m tol n_iter r' (i+1) l'
                                (_,_) -> (divide_matrix_scalar r (norm r), norm r, i)
                                where (l',r') = iteracion m r l

iteracion :: Matrix -> Matrix -> Matrix -> (Matrix, Matrix)
iteracion m r l = (l', m * l')
                   where l' =  divide_matrix_scalar r (norm r)


precision :: Matrix -> Matrix -> Double -> Double
precision a x l = maxCoeff $ (a*x) - mult_matrix_scalar x l


-- DATOS

alfa = 30
a = fromList [[alfa,2,3,13],[5,11,10,8],[9,7,6,12],[4,14,15,1]]
tol = 1e-10
nmax = 100
x0 = ones 4 1
(x, lambda, iter) = potencia a tol nmax x0
prec = precision a x lambda
--precision = a*x

main :: IO ()
main = do putStrLn "x:"
          putStrLn $ show x
          putStrLn "lambda:"
          putStrLn $ show lambda
          putStrLn "n_iter"
          putStrLn $ show iter
          putStrLn "precision:"
          putStrLn $ show prec
          putStrLn ""