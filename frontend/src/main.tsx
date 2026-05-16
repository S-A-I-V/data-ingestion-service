import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/index.css";

const bgImage = new Image();
bgImage.src = "/images/signin-landscape.jpeg";

const mount = () => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  );
};

if (bgImage.complete) {
  mount();
} else {
  const timeout = setTimeout(mount, 400);
  bgImage.onload = () => {
    clearTimeout(timeout);
    mount();
  };
  bgImage.onerror = () => {
    clearTimeout(timeout);
    mount();
  };
}
