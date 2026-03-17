import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Validation des variables d'environnement au démarrage ──
const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;
const missingVars = REQUIRED_ENV.filter(
  (key) => !import.meta.env[key] || import.meta.env[key] === "",
);
if (missingVars.length > 0) {
  console.error(
    `[Departo] Variables d'environnement manquantes : ${missingVars.join(", ")}\n` +
    "Copiez .env.example vers .env.local et renseignez vos clés Supabase.",
  );
}

createRoot(document.getElementById("root")!).render(<App />);
