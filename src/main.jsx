import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/app.css";
import { BodegaProvider } from "./store/BodegaContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BodegaProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </BodegaProvider>
  </React.StrictMode>
);

