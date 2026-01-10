(ns my.utils
  (:require ["os" :as os]))

(defn hello [name source] (str "Hello " name " from " source))

(defn os-arch [] (os/arch))