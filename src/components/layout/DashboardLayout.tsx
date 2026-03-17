import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useAlertes } from "@/hooks/useAlertes";
import AlertesBadge from "@/components/alertes/AlertesBadge";
import AlertesPanel from "@/components/alertes/AlertesPanel";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  Settings,
  LogOut,
  Building2,
  FileText,
  DoorOpen,
  CalendarDays,
  AlertTriangle,
  ClipboardList,
  ChevronRight,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUniversity, University } from "@/services/universities.service";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const menuByRole: Record<string, MenuItem[]> = {
  chef: [
    { title: "Tableau de bord", url: "/dashboard/chef", icon: LayoutDashboard },
    { title: "Référentiel", url: "/dashboard/chef/referentiel", icon: FileText },
    { title: "Enseignants", url: "/dashboard/chef/enseignants", icon: Users },
    { title: "Emploi du temps", url: "/dashboard/chef/emploi-du-temps", icon: CalendarDays },
    { title: "Perturbations", url: "/dashboard/chef/perturbations", icon: AlertTriangle },
    { title: "Présences", url: "/dashboard/chef/presences", icon: ClipboardList },
    { title: "Examens", url: "/dashboard/chef/examens", icon: GraduationCap },
    { title: "Notes", url: "/dashboard/chef/notes", icon: BookOpen },
    { title: "Documents", url: "/dashboard/chef/documents", icon: FileText },
    { title: "Salles", url: "/dashboard/chef/salles", icon: DoorOpen },
    { title: "Équipe", url: "/dashboard/chef/equipe", icon: Users },
    { title: "Paramètres", url: "/dashboard/chef/parametres", icon: Settings },
  ],
  assistant: [
    { title: "Tableau de bord", url: "/dashboard/assistant", icon: LayoutDashboard },
    { title: "Référentiel", url: "/dashboard/assistant/referentiel", icon: FileText },
    { title: "Enseignants", url: "/dashboard/assistant/enseignants", icon: Users },
    { title: "Emploi du temps", url: "/dashboard/assistant/emploi-du-temps", icon: CalendarDays },
    { title: "Perturbations", url: "/dashboard/assistant/perturbations", icon: AlertTriangle },
    { title: "Présences", url: "/dashboard/assistant/presences", icon: ClipboardList },
    { title: "Examens", url: "/dashboard/assistant/examens", icon: GraduationCap },
    { title: "Notes", url: "/dashboard/assistant/notes", icon: BookOpen },
    { title: "Documents", url: "/dashboard/assistant/documents", icon: FileText },
    { title: "Salles", url: "/dashboard/assistant/salles", icon: DoorOpen },
  ],
  enseignant: [
    { title: "Tableau de bord", url: "/dashboard/enseignant", icon: LayoutDashboard },
    { title: "Mon emploi du temps", url: "/dashboard/enseignant/emploi-du-temps", icon: CalendarDays },
    { title: "Mes disponibilités", url: "/dashboard/enseignant/disponibilites", icon: Users },
    { title: "Mes présences", url: "/dashboard/enseignant/presences", icon: ClipboardList },
    { title: "Mes sujets", url: "/dashboard/enseignant/sujets", icon: FileText },
    { title: "Mes heures", url: "/dashboard/enseignant/heures", icon: Settings },
  ],
  owner: [
    { title: "Tableau de bord",      url: "/dashboard/owner",                icon: LayoutDashboard },
    { title: "Plans tarifaires",     url: "/dashboard/owner/plans",          icon: CreditCard },
    { title: "Licences & Paiements", url: "/dashboard/owner/licences",       icon: CalendarDays },
    { title: "Comptabilité",         url: "/dashboard/owner/comptabilite",   icon: BarChart3 },
    { title: "Universités",          url: "/dashboard/owner/universites",    icon: GraduationCap },
    { title: "Départements",         url: "/dashboard/owner/departements",   icon: Building2 },
    { title: "Utilisateurs",         url: "/dashboard/owner/utilisateurs",   icon: Users },
    { title: "Paramètres",           url: "/dashboard/owner/parametres",     icon: Settings },
  ],
};

// Breadcrumb helper
function buildBreadcrumbs(pathname: string, role: string | null): { label: string; path?: string }[] {
  const crumbs: { label: string; path?: string }[] = [{ label: "Accueil", path: `/dashboard/${role || "chef"}` }];
  const items = menuByRole[role || "chef"] || [];
  const match = items.find((i) => pathname === i.url || (pathname.startsWith(i.url) && i.url !== `/dashboard/${role}`));
  if (match) {
    crumbs.push({ label: match.title });
  }
  return crumbs;
}

function SidebarNav() {
  const { role, profile, department, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const items = menuByRole[role || "enseignant"] || [];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <GraduationCap className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && <span className="font-bold text-sidebar-foreground">Departo</span>}
      </div>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50 flex items-center justify-between"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <span className="flex items-center">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </span>
                      {!collapsed && item.badge && item.badge > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto p-4 border-t border-sidebar-border">
        {!collapsed && (
          <div className="mb-3 text-xs text-sidebar-foreground/70">
            <p className="font-medium truncate">{profile?.full_name}</p>
            <p className="truncate">{department?.name || "—"}</p>
          </div>
        )}
        <Button variant="ghost" size={collapsed ? "icon" : "sm"} onClick={handleSignOut} className="w-full text-sidebar-foreground hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Déconnexion</span>}
        </Button>
      </div>
    </Sidebar>
  );
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title }) => {
  const { role, profile, department } = useAuth();
  const location = useLocation();
  const breadcrumbs = buildBreadcrumbs(location.pathname, role);

  // Logo université
  const [universityLogo, setUniversityLogo] = useState<string | null>(null);
  useEffect(() => {
    const uid = (department as any)?.university_id;
    if (!uid) { setUniversityLogo(null); return; }
    getUniversity(uid)
      .then((u: University) => setUniversityLogo(u.logo_url))
      .catch(() => setUniversityLogo(null));
  }, [(department as any)?.university_id]);

  // Alertes — visibles pour chef, assistant et owner
  const showAlertes = role === "chef" || role === "assistant" || role === "owner";
  const { alertes, nb_non_lues, marquerLue, marquerToutesLues } = useAlertes(
    showAlertes ? profile?.department_id : null,
  );
  const [alertesPanelOpen, setAlertesPanelOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SidebarNav />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-4 shrink-0">
            <SidebarTrigger />
            <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-0 flex-1">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                  <span className={i === breadcrumbs.length - 1 ? "text-foreground font-medium truncate" : "truncate"}>
                    {crumb.label}
                  </span>
                </span>
              ))}
            </div>
            {/* Logo université */}
            {universityLogo && (
              <img
                src={universityLogo}
                alt="Logo université"
                className="h-8 w-8 rounded object-contain shrink-0"
              />
            )}
            {showAlertes && (
              <AlertesBadge
                nb_non_lues={nb_non_lues}
                onClick={() => setAlertesPanelOpen(true)}
              />
            )}
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
        </div>
      </div>

      {showAlertes && (
        <AlertesPanel
          open={alertesPanelOpen}
          onClose={() => setAlertesPanelOpen(false)}
          alertes={alertes}
          nb_non_lues={nb_non_lues}
          onMarquerLue={marquerLue}
          onMarquerToutesLues={marquerToutesLues}
        />
      )}
    </SidebarProvider>
  );
};

export default DashboardLayout;
