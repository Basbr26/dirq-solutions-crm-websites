import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/validation-messages"; // Initialize Dutch validation messages
import { initSentry } from "./lib/sentry";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";

// Initialize Sentry before rendering the app
initSentry();

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);
