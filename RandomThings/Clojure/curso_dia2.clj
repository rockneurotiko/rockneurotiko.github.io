(defn test []
  (print "MyClj: ")
  (flush)
  (let [exp (eval (read))]
    (if (not= :exit exp)
      (println exp)
      (throw (Exception. "PUTA"))))
  (recur))

