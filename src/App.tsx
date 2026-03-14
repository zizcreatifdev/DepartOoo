import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import ChefDashboard from "./pages/dashboard/ChefDashboard";
import AssistantDashboard from "./pages/dashboard/AssistantDashboard";
import EnseignantDashboard from "./pages/dashboard/EnseignantDashboard";
import OwnerDashboard from "./pages/dashboard/OwnerDashboard";
import ReferentielPage from "./pages/referentiel/ReferentielPage";
import SallesPage from "./pages/salles/SallesPage";
import EnseignantsPage from "./pages/enseignants/EnseignantsPage";
import EnseignantDisponibilitesPage from "./pages/enseignants/EnseignantDisponibilitesPage";
import EnseignantEmploiDuTempsPage from "./pages/enseignant/EnseignantEmploiDuTempsPage";
import EnseignantPresencesPage from "./pages/enseignant/EnseignantPresencesPage";
import EnseignantSujetsPage from "./pages/enseignant/EnseignantSujetsPage";
import EnseignantHeuresPage from "./pages/enseignant/EnseignantHeuresPage";
import EmploiDuTempsPage from "./pages/emploi-du-temps/EmploiDuTempsPage";
import PerturbationsPage from "./pages/perturbations/PerturbationsPage";
import PresencesPage from "./pages/presences/PresencesPage";
import ExamensPage from "./pages/examens/ExamensPage";
import NotesPage from "./pages/notes/NotesPage";
import DocumentsPage from "./pages/documents/DocumentsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<ProtectedRoute allowedRoles={["chef"]}><Onboarding /></ProtectedRoute>} />
            <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/chef" element={<ProtectedRoute allowedRoles={["chef"]}><ChefDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/chef/referentiel" element={<ProtectedRoute allowedRoles={["chef"]}><ReferentielPage /></ProtectedRoute>} />
            <Route path="/dashboard/chef/salles" element={<ProtectedRoute allowedRoles={["chef"]}><SallesPage /></ProtectedRoute>} />
            <Route path="/dashboard/chef/enseignants" element={<ProtectedRoute allowedRoles={["chef"]}><EnseignantsPage /></ProtectedRoute>} />
            <Route path="/dashboard/chef/emploi-du-temps" element={<ProtectedRoute allowedRoles={["chef"]}><EmploiDuTempsPage /></ProtectedRoute>} />
            <Route path="/dashboard/chef/perturbations" element={<ProtectedRoute allowedRoles={["chef"]}><PerturbationsPage /></ProtectedRoute>} />
            <Route path="/dashboard/chef/presences" element={<ProtectedRoute allowedRoles={["chef"]}><PresencesPage /></ProtectedRoute>} />
            <Route path="/dashboard/chef/examens" element={<ProtectedRoute allowedRoles={["chef"]}><ExamensPage /></ProtectedRoute>} />
            <Route path="/dashboard/chef/notes" element={<ProtectedRoute allowedRoles={["chef"]}><NotesPage /></ProtectedRoute>} />
            <Route path="/dashboard/chef/documents" element={<ProtectedRoute allowedRoles={["chef"]}><DocumentsPage /></ProtectedRoute>} />
            <Route path="/dashboard/chef/*" element={<ProtectedRoute allowedRoles={["chef"]}><ChefDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/assistant" element={<ProtectedRoute allowedRoles={["assistant"]}><AssistantDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/assistant/referentiel" element={<ProtectedRoute allowedRoles={["assistant"]}><ReferentielPage /></ProtectedRoute>} />
            <Route path="/dashboard/assistant/salles" element={<ProtectedRoute allowedRoles={["assistant"]}><SallesPage /></ProtectedRoute>} />
            <Route path="/dashboard/assistant/enseignants" element={<ProtectedRoute allowedRoles={["assistant"]}><EnseignantsPage /></ProtectedRoute>} />
            <Route path="/dashboard/assistant/emploi-du-temps" element={<ProtectedRoute allowedRoles={["assistant"]}><EmploiDuTempsPage /></ProtectedRoute>} />
            <Route path="/dashboard/assistant/perturbations" element={<ProtectedRoute allowedRoles={["assistant"]}><PerturbationsPage /></ProtectedRoute>} />
            <Route path="/dashboard/assistant/presences" element={<ProtectedRoute allowedRoles={["assistant"]}><PresencesPage /></ProtectedRoute>} />
            <Route path="/dashboard/assistant/examens" element={<ProtectedRoute allowedRoles={["assistant"]}><ExamensPage /></ProtectedRoute>} />
            <Route path="/dashboard/assistant/notes" element={<ProtectedRoute allowedRoles={["assistant"]}><NotesPage /></ProtectedRoute>} />
            <Route path="/dashboard/assistant/documents" element={<ProtectedRoute allowedRoles={["assistant"]}><DocumentsPage /></ProtectedRoute>} />
            <Route path="/dashboard/assistant/*" element={<ProtectedRoute allowedRoles={["assistant"]}><AssistantDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/enseignant" element={<ProtectedRoute allowedRoles={["enseignant"]}><EnseignantDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/enseignant/emploi-du-temps" element={<ProtectedRoute allowedRoles={["enseignant"]}><EnseignantEmploiDuTempsPage /></ProtectedRoute>} />
            <Route path="/dashboard/enseignant/disponibilites" element={<ProtectedRoute allowedRoles={["enseignant"]}><EnseignantDisponibilitesPage /></ProtectedRoute>} />
            <Route path="/dashboard/enseignant/presences" element={<ProtectedRoute allowedRoles={["enseignant"]}><EnseignantPresencesPage /></ProtectedRoute>} />
            <Route path="/dashboard/enseignant/sujets" element={<ProtectedRoute allowedRoles={["enseignant"]}><EnseignantSujetsPage /></ProtectedRoute>} />
            <Route path="/dashboard/enseignant/heures" element={<ProtectedRoute allowedRoles={["enseignant"]}><EnseignantHeuresPage /></ProtectedRoute>} />
            <Route path="/dashboard/enseignant/*" element={<ProtectedRoute allowedRoles={["enseignant"]}><EnseignantDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/owner" element={<ProtectedRoute allowedRoles={["owner"]}><OwnerDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/owner/*" element={<ProtectedRoute allowedRoles={["owner"]}><OwnerDashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
