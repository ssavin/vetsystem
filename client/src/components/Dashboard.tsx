import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Calendar, Clock, AlertCircle, Banknote, Package } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { useTranslation } from "react-i18next"
import { type DashboardStats, type Appointment } from "@shared/schema"
import AppointmentCard from "./AppointmentCard"
import { StatCardSkeleton, AppointmentCardSkeleton, NotificationRowSkeleton } from "./ui/loading-skeletons"
import { AIAssistantWidget } from "./AIAssistantWidget"

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Helper function to map database appointment status to component status
const mapAppointmentStatus = (dbStatus: string | null): 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show' => {
  if (!dbStatus) return 'scheduled';
  
  switch (dbStatus) {
    case 'in_progress':
      return 'in-progress'; // Map underscore to hyphen
    case 'no_show':
      return 'no-show'; // Map underscore to hyphen
    case 'scheduled':
    case 'confirmed':
    case 'completed':
    case 'cancelled':
      return dbStatus as 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
    default:
      return 'scheduled'; // fallback
  }
};

// Helper function to format appointment data for AppointmentCard
const formatAppointmentForCard = (appointment: Appointment) => ({
  id: appointment.id,
  time: new Date(appointment.appointmentDate).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  }),
  duration: `${appointment.duration} мин`,
  patientName: "Пациент", // This will be populated when we add relations
  patientSpecies: "Животное",
  ownerName: "Владелец",
  doctorName: "Доктор",
  appointmentType: appointment.appointmentType,
  status: mapAppointmentStatus(appointment.status),
  notes: appointment.notes || ""
});



export default function Dashboard() {
  const [, navigate] = useLocation()
  const { t } = useTranslation('dashboard')

  // Fetch current user to determine role
  const { data: currentUser } = useQuery<{ role: string }>({
    queryKey: ['/api/auth/me']
  })

  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError 
  } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats']
  });

  const { 
    data: appointments, 
    isLoading: appointmentsLoading, 
    error: appointmentsError 
  } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments', { date: getTodayDateString() }],
    queryFn: async () => {
      const response = await fetch(`/api/appointments?date=${getTodayDateString()}`);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    }
  });

  const todayAppointments = appointments ? appointments.slice(0, 3).map(formatAppointmentForCard) : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statsLoading ? (
          <StatCardSkeleton />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalPatientsToday')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsError ? (
                <div className="text-2xl font-bold text-destructive">{t('stats.error')}</div>
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-patients">{appointments?.length || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('stats.inClinic')}
              </p>
            </CardContent>
          </Card>
        )}



        {statsLoading ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <NotificationRowSkeleton />
                <NotificationRowSkeleton />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('notifications.title')}</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('notifications.debts')}</span>
                  <Badge variant="destructive" className="text-xs">{stats?.pendingPayments || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('notifications.lowStock')}</span>
                  <Badge variant="secondary" className="text-xs">{stats?.lowStockCount || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('schedule.title')}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/schedule')}
              data-testid="button-view-full-schedule"
            >
              {t('schedule.viewFullDay')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {appointmentsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <AppointmentCardSkeleton key={i} />
              ))}
            </div>
          ) : appointmentsError ? (
            <div className="text-center py-4 text-muted-foreground">
              {t('schedule.loadingError')}
            </div>
          ) : todayAppointments.length > 0 ? (
            todayAppointments.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              {t('schedule.noAppointments')}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('quickActions.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              className="h-16 flex-col gap-2" 
              variant="outline" 
              onClick={() => navigate('/registry')}
              data-testid="button-new-patient"
            >
              <Users className="h-5 w-5" />
              <span>{t('quickActions.newPatient')}</span>
            </Button>
            <Button 
              className="h-16 flex-col gap-2" 
              variant="outline" 
              onClick={() => navigate('/schedule')}
              data-testid="button-new-appointment"
            >
              <Calendar className="h-5 w-5" />
              <span>{t('quickActions.newAppointment')}</span>
            </Button>
            <Button 
              className="h-16 flex-col gap-2" 
              variant="outline" 
              onClick={() => navigate('/finance')}
              data-testid="button-new-invoice"
            >
              <Banknote className="h-5 w-5" />
              <span>{t('quickActions.newInvoice')}</span>
            </Button>
            <Button 
              className="h-16 flex-col gap-2" 
              variant="outline" 
              onClick={() => navigate('/services-inventory')}
              data-testid="button-inventory"
            >
              <Package className="h-5 w-5" />
              <span>{t('quickActions.inventory')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant Widget - available for all users */}
      {currentUser && (
        <AIAssistantWidget 
          role={currentUser.role === 'врач' ? 'doctor' : 'admin'} 
        />
      )}
    </div>
  )
}