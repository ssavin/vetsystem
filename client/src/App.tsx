import { Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import TopNavbar from "@/components/TopNavbar";
import TopHeader from "@/components/TopHeader";
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
import Hospital from "@/pages/Hospital";
import NotFound from "@/pages/not-found";
import { IncomingCallNotification } from "@/components/IncomingCallNotification";

function AuthenticatedApp() {
  return (
    <>
      <IncomingCallNotification />
      <div className="flex flex-col h-screen w-full bg-background">
        <TopHeader />
        <TopNavbar />
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
            <Route path="/hospital" component={Hospital} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground font-medium">Загрузка VetSystem...</p>
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
