import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Projection from "./Projection";
import { windowLabel } from "./lib/window";
import "./styles.css";

const isProjection = windowLabel() === "projection";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isProjection ? <Projection /> : <App />}
  </React.StrictMode>,
);
