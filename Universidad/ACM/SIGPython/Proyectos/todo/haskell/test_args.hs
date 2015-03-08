import Control.Applicative
import Options

data MainOptions = MainOptions
    { optMessage :: String
    , optQuiet :: Bool
    }

instance Options MainOptions where
    defineOptions = pure MainOptions
        <*> simpleOption "message" "Hello world!"
            "A message to show the user."
        <*> simpleOption "quiet" False
            "Whether to be quiet."

main :: IO ()
main = runCommand $ \opts args -> do
    if optQuiet opts
        then return ()
        else putStrLn (optMessage opts)