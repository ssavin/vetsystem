import { Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import "./i18n";
import DashboardPage from "@/pages/Dashboard";
import Registry from "@/pages/Registry";
import Schedule from "@/pages/Schedule";
import MedicalRecords from "@/pages/MedicalRecords";
import ClinicalCases from "@/pages/ClinicalCases";
import ClinicalCaseDetail from "@/pages/ClinicalCaseDetail";
import Laboratory from "@/pages/Laboratory";
import ServicesInventory from "@/pages/ServicesInventory";
import Finance from "@/pages/Finance";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import UserManagement from "@/pages/UserManagement";
import Branches from "@/pages/Branches";
import LegalEntities from "@/pages/LegalEntities";
import SubscriptionManagement from "@/pages/SubscriptionManagement";
import MySubscription from "@/pages/MySubscription";
import SuperAdminPanel from "@/pages/SuperAdminPanel";
import AITestPage from "@/pages/AITestPage";
import MoyskladNomenclature from "@/pages/MoyskladNomenclature";
import OneCRetail from "@/pages/OneCRetail";
import DocumentTemplates from "@/pages/DocumentTemplates";
import Queue from "@/pages/Queue";
import QueueDisplay from "@/pages/QueueDisplay";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import BranchSelector from "@/components/BranchSelector";
import TenantSelector from "@/components/TenantSelector";

function AuthenticatedApp() {
  const { user, logout } = useAuth();

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center space-x-4">
              <TenantSelector />
              <BranchSelector />
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.fullName}</span>
                <span className="text-xs text-muted-foreground">({user?.role})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={DashboardPage} />
              <Route path="/registry" component={Registry} />
              <Route path="/schedule" component={Schedule} />
              <Route path="/medical-records" component={MedicalRecords} />
              <Route path="/clinical-cases" component={ClinicalCases} />
              <Route path="/clinical-cases/:id" component={ClinicalCaseDetail} />
              <Route path="/laboratory" component={Laboratory} />
              <Route path="/services-inventory" component={ServicesInventory} />
              <Route path="/finance" component={Finance} />
              <Route path="/reports" component={Reports} />
              <Route path="/settings" component={Settings} />
              <Route path="/users" component={UserManagement} />
              <Route path="/branches" component={Branches} />
              <Route path="/legal-entities" component={LegalEntities} />
              <Route path="/subscriptions" component={SubscriptionManagement} />
              <Route path="/my-subscription" component={MySubscription} />
              <Route path="/superadmin" component={SuperAdminPanel} />
              <Route path="/ai-test" component={AITestPage} />
              <Route path="/moysklad-nomenclature" component={MoyskladNomenclature} />
              <Route path="/onec-retail" component={OneCRetail} />
              <Route path="/document-templates" component={DocumentTemplates} />
              <Route path="/queue/display" component={QueueDisplay} />
              <Route path="/queue" component={Queue} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
