import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  switch (role) {
    case "chef":
      return <Navigate to="/dashboard/chef" replace />;
    case "assistant":
      return <Navigate to="/dashboard/assistant" replace />;
    case "enseignant":
      return <Navigate to="/dashboard/enseignant" replace />;
    case "owner":
      return <Navigate to="/dashboard/owner" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default Dashboard;
