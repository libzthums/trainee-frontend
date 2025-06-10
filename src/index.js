import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter, Router } from "react-router-dom";
import { UrlRoutes } from "./router/route";
import 'bootstrap/dist/css/bootstrap.min.css';
import { UserProvider } from "./context/UserProvider";
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <UserProvider>
  <React.StrictMode>
    <BrowserRouter>
      <UrlRoutes>
       
        <App />
      
      </UrlRoutes>
    </BrowserRouter>
  </React.StrictMode>
  </UserProvider>
);

reportWebVitals();