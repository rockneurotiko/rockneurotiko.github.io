import Data.List
import Data.List.Split
import Data.String
import Data.Char


import System.Console.ANSI
import Control.Applicative
import Control.Monad (unless, when)
import Options

-- Arg Parse Data Types
data MainOptions = MainOptions { addTarea :: String
    , addPriority :: String
    , addHilo :: String
    , showHilos :: Bool
    , showTareasHilo :: String
    , removeTarea :: Int
    , modifyTarea :: String
    , filePath :: String
    }

-- Arg Parse Instance
instance Options MainOptions where
    defineOptions = pure MainOptions
        <*> simpleOption "add" ""
            "A message to show the user."
        <*> simpleOption "priority" ""
            "Whether to be quiet."
        <*> simpleOption "thread" ""
            "Whether to be quiet."
        <*> simpleOption "list" False
            "Whether to be quiet."
        <*> simpleOption "by-thread" ""
            "Whether to be quiet."
        <*> simpleOption "remove" (-1)
            "Whether to be quiet."
        <*> simpleOption "modify" ""
            "Whether to be quiet."
        <*> simpleOption "file" ".hs.todo"
            "The File to save the TODO's"

-- Own Data Type
data Prioridad = Alta | Media | Baja | None
                deriving (Show, Eq)

-- Type Alias
type Id = Int
type Hilo = String
type Tarea = String
type TTarea = (Prioridad, Hilo, Tarea)
type Linea = (Id, TTarea)

-- Changes of dataTipes

priorToColor :: Prioridad -> Color --SGR
priorToColor Alta =  Red --SetColor Foreground Vivid Red
priorToColor Media = Yellow --SetColor Foreground Vivid Yellow
priorToColor Baja =  Blue --SetColor Foreground Vivid Blue

strToPrior :: String -> Prioridad
strToPrior "ALTA" = Alta
strToPrior "MEDIA" = Media
strToPrior "BAJA" = Baja
strToPrior x = None

priorToStr :: Prioridad -> String
priorToStr Alta = "ALTA"
priorToStr Media = "MEDIA"
priorToStr Baja = "BAJA"

printWithColor :: Color -> String -> IO ()
printWithColor c s = do
    setSGR [cs]
    putStrLn s
    setSGR []
    where cs = SetColor Foreground Vivid c

-- Most basic print (just one Line)
printLinea :: Linea -> IO ()
printLinea (l_id,(prior,hilo,tarea)) = do
    printWithColor color line
    return ()
    where line = "(" ++ sl_id ++ ") " ++ tarea
          sl_id = show l_id
          color = priorToColor prior
    --do  setSGR [color]
    --    putStrLn ("(" ++ sl_id ++ ") " ++ tarea)
    --    setSGR []
    --where sl_id = show l_id
    --      s_prior = priorToStr prior
    --      color = priorToColor prior

-- Print all the lines of the same priority
printPrior :: [Linea] -> Prioridad -> IO ()
printPrior l prior = do
            let filt = filter (\(_,(x,_,_)) -> x==prior) l
            if length filt > 0
            then do
                printWithColor color (priorToStr prior)
                mapM printLinea filt
            else return [()]
            --then do
            --    setSGR [color]
            --    putStrLn (priorToStr prior)
            --    setSGR []
            --    mapM printLinea filt
            --else
            --    return [()]
            return ()
        where color = priorToColor prior

-- Print all the priorities in order of a given list
printAllPriors :: [Linea] -> IO ()
printAllPriors l = do
                    mapM (printPrior l) prior
                    return ()
                where prior = [Alta, Media, Baja]

-- Print all the thread, by priority
printHilo :: [Linea] -> Hilo -> IO ()
printHilo l h = do
    setSGR [hcolor]
    putStrLn (replicate 15 '-')
    putStrLn h
    putStrLn (replicate 15 '-')
    setSGR []
    let filt = filter (\(_,(_,x,_)) -> x == h) l
    printAllPriors filt
    putStrLn ""
    return ()
    where hcolor = SetColor Foreground Vivid Magenta

-- Print all threads, by priority
printAllHilos :: [Linea] -> IO ()
printAllHilos l = do
    mapM (printHilo l) hilos
    return ()
    where hilos = getAllHilos l

-- Aux func. to get all threads
getAllHilos :: [Linea] -> [Hilo]
getAllHilos l = nub $ [x | (_,(_,x,_)) <- l]

-- Aux func to format a priority
formatPrior :: String -> String
formatPrior x = priorToStr (strToPrior x)

-- Aux func to format a task
formatTarea :: String -> String -> String -> String
formatTarea tarea prioridad hilo = case (tarea, prioridad, hilo) of
    (t, "", (h:hs)) -> "ALTA:" ++ (h:hs) ++ ":" ++ t
    (t, (p:ps), "") -> do
        if (strToPrior (p:ps)) /= None
        then (formatPrior (p:ps)) ++ ":TODO:" ++ t
        else ""
    (t, "", "") -> "ALTA:TODO:" ++ t
    (t, p, h) -> do
        if (strToPrior p) /= None
        then (formatPrior p) ++ ":" ++ h ++ ":" ++ t
        else ""

-- Aux func to parse a string into a task
parseTarea :: String -> [TTarea]
parseTarea s = if prior /= None
    then [(prior, (x!!1), (x!!2))]
    else []
    where prior = strToPrior (x!!0)
          x = splitOn ":" s

-- get a list of strings and parse to a list of tasks
toTasks :: [String] -> [TTarea]
toTasks [] = []
toTasks (x:xs) = parseTarea x ++ toTasks xs

-- get a list of tasks (without ID) and zip it with his id
buildLines :: [TTarea] -> [Id] -> [Linea]
buildLines [] _ = []
buildLines s n = zip n s

-- Read all content of a file and convert it to lines
readContent :: FilePath -> IO [Linea]
readContent p = do
            y <- readFile p
            let x = lines y
            let n = length x
            let tareas = toTasks x
            let res = buildLines tareas [0..n-1]
            return res

-- MAIN FUNCTIONS (Called by Arg Parser)

-- Print ALL content of a file
printContent :: FilePath -> IO ()
printContent p = do
    lins <- readContent p
    printAllHilos lins
    --mapM printLinea lins
    return ()

-- Add a Task to the file
-- TODO: If exist, don't write it
addTareaFunc :: String -> String -> String -> String -> IO ()
addTareaFunc tarea prioridad hilo file = do
    if ft == ""
        then do putStrLn "ERROR, PRIORITY DON'T EXIST"
                return ()
        else appendFile file (ft ++ "\n")
    where ft = (formatTarea tarea prioridad hilo)

-- Print the threads names :-)
printThreads :: FilePath -> IO ()
printThreads p = do
    lins <- readContent p
    let threads = getAllHilos lins
    let color = Magenta
    printWithColor Yellow (replicate 15 '-')
    printWithColor Yellow "Threads:"
    printWithColor Yellow (replicate 15 '-')
    mapM (printWithColor color) threads
    return ()


main :: IO ()
main = runCommand $ \opts args -> do
    case ((addTarea opts), (addPriority opts),
          (addHilo opts), (showHilos opts),
          (showTareasHilo opts), (removeTarea opts),
          (modifyTarea opts), (filePath opts)) of
        ("","","",False,"",(-1),"", p) -> printContent p
        ("",(x:_),(y:_),_,_,_,"", _) -> putStrLn "ERROR"
        (a,b,c,False,_,_,_, f) -> addTareaFunc a b c f
        (_,_,_,True,_,_,_, f) -> printThreads f