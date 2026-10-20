import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/outfit/800.css";
import "@fontsource/archivo-black/latin-400.css";
import "@fontsource/barlow-condensed/latin-900.css";
import { App } from "./app";
import "./styles.css";
import "./game.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
