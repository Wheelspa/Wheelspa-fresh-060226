import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress ResizeObserver loop error (known browser issue, not a real error)
const resizeObserverError = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  if (message && message.includes('ResizeObserver loop')) {
    return true;
  }
  return resizeObserverError ? resizeObserverError(message, source, lineno, colno, error) : false;
};

// Also suppress in error event
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
