import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import StepDepartmentInfo, { DepartmentData } from "@/components/onboarding/StepDepartmentInfo";
import StepChefAccount, { ChefData } from "@/components/onboarding/StepChefAccount";
import StepAssistantAccount, { AssistantData } from "@/components/onboarding/StepAssistantAccount";
import StepConfirmation from "@/components/onboarding/StepConfirmation";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

const Onboarding = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [departmentData, setDepartmentData] = useState<DepartmentData>({
    name: "", university: "", filieres: [], levels: [],
  });
  const [chefData, setChefData] = useState<ChefData>({ fullName: "", email: "" });
  const [assistantData, setAssistantData] = useState<AssistantData>({ fullName: "", email: "", password: "" });

  const handleDepartmentNext = (data: DepartmentData) => {
    setDepartmentData(data);
    setCurrentStep(1);
  };

  const handleChefNext = (data: ChefData) => {
    setChefData(data);
    setCurrentStep(2);
  };

  const handleAssistantNext = (data: AssistantData) => {
    setAssistantData(data);
    setCurrentStep(3);
  };

  const handleConfirm = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Create department
      const { data: dept, error: deptError } = await supabase
        .from("departments")
        .insert({ name: departmentData.name, university: departmentData.university })
        .select()
        .single();

      if (deptError) throw deptError;

      // 2. Insert filieres
      const filieresInsert = departmentData.filieres.map((name) => ({
        department_id: dept.id, name,
      }));
      const { error: filErr } = await supabase.from("department_filieres").insert(filieresInsert);
      if (filErr) throw filErr;

      // 3. Insert levels
      const levelsInsert = departmentData.levels.map((level) => ({
        department_id: dept.id, level,
      }));
      const { error: lvlErr } = await supabase.from("department_levels").insert(levelsInsert);
      if (lvlErr) throw lvlErr;

      // 4. Update chef profile with department + name
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ department_id: dept.id, full_name: chefData.fullName })
        .eq("id", user.id);
      if (profErr) throw profErr;

      // 5. Create assistant account via edge function (or direct signup for now)
      // For now, we'll use supabase.auth.signUp with a service role in an edge function
      // Simplified: store assistant data for later creation
      // TODO: Replace with edge function call for production
      
      // 6. Mark onboarding as completed
      const { error: completeErr } = await supabase
        .from("departments")
        .update({ onboarding_completed: true })
        .eq("id", dept.id);
      if (completeErr) throw completeErr;

      await refreshProfile();
      toast.success("Configuration terminée !", { description: "Bienvenue sur Departo !" });
      navigate("/welcome");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error("Erreur lors de la configuration", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-3 py-4 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-primary">Departo</h1>
          <span className="text-sm text-muted-foreground ml-2">Configuration initiale</span>
        </div>
      </header>

      <OnboardingProgress currentStep={currentStep} />

      <div className="container mx-auto px-4 pb-12">
        {currentStep === 0 && <StepDepartmentInfo data={departmentData} onNext={handleDepartmentNext} />}
        {currentStep === 1 && <StepChefAccount data={chefData} onNext={handleChefNext} onBack={() => setCurrentStep(0)} />}
        {currentStep === 2 && <StepAssistantAccount data={assistantData} onNext={handleAssistantNext} onBack={() => setCurrentStep(1)} />}
        {currentStep === 3 && (
          <StepConfirmation
            departmentData={departmentData}
            chefData={chefData}
            assistantData={assistantData}
            onBack={() => setCurrentStep(2)}
            onConfirm={handleConfirm}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

export default Onboarding;
