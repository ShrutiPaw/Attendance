import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App.tsx";
import "./index.css";

// Global error handlers help capture startup errors (useful for iOS debugging)
if (typeof window !== "undefined") {
  window.addEventListener("error", (ev: ErrorEvent) => {
    // eslint-disable-next-line no-console
    console.error("[Global error]", (ev as any).error || ev.message, ev);
  });

  window.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
    // eslint-disable-next-line no-console
    console.error("[Unhandled rejection]", (ev as any).reason, ev);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
