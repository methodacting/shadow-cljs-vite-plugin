(ns my.app
  (:require
   [my.utils :as utils]))

(defn ^:export browser-init []
  (js/document.write (utils/hello "world" "browser")))

(defn ^:export node-init []
  (utils/hello (utils/os-arch) "node"))

(def ^:export worker-init
  #js {:fetch (fn [request env ctx]
                (js/Response. (node-init)))})