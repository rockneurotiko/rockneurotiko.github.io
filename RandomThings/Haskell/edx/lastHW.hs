-- fl f a bs = foldr (\b -> \g -> (\a -> g (f a b))) id bs a
-- fl f = flip $ foldr (\a b g -> b (f g a)) id
fl = foldr . flip

