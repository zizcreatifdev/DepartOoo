import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AssistantDashboard = () => {
  return (
    <DashboardLayout title="Tableau de bord — Assistant">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bienvenue, Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Vous pouvez gérer les enseignants, les filières et assister le chef de département dans la gestion académique.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AssistantDashboard;
