

putStr' :: String -> IO ()
putStr' [] = return ()
putStr' (x:xs) = putChar x >> putStr' xs


putStrLn' :: String -> IO ()
putStrLn' [] = putChar '\n'
putStrLn' xs = putStr' xs >> putStrLn' ""

putStrLn2' :: String -> IO ()
putStrLn2' [] = putChar '\n'
putStrLn2' xs = putStr' xs >> putChar '\n'

putStrLn3' :: String -> IO ()
putStrLn3' [] = putChar '\n'
putStrLn3' xs = putStr' xs >>= \ x -> putChar '\n'

putStrLn4' :: String -> IO ()
putStrLn4' [] = putChar '\n'
putStrLn4' xs = putStr' xs >> putStr' "\n"


sequence_' :: Monad m => [m a] -> m ()
sequence_' [] = return ()
sequence_' (m:ms) = (foldl (>>) m ms) >> return ()

sequence1_' :: Monad m => [m a] -> m ()
sequence1_' ms = foldr (>>) (return ()) ms

test :: Char -> IO Char
test x = putChar '\n' >> getChar