import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Calendar, Clock, TrendingUp, AlertCircle, CheckCircle, DollarSign, Package } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { type DashboardStats, type Appointment, type Patient } from "@shared/schema"
import PatientCard from "./PatientCard"
import AppointmentCard from "./AppointmentCard"
import { StatCardSkeleton, AppointmentCardSkeleton, PatientCardSkeleton, QuickActionSkeleton, NotificationRowSkeleton } from "./ui/loading-skeletons"

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

// Helper function to map database patient status to component status
const mapPatientStatus = (dbStatus: string | null): 'healthy' | 'treatment' | 'critical' => {
  if (!dbStatus) return 'healthy';
  
  switch (dbStatus) {
    case 'healthy':
      return 'healthy';
    case 'sick':
    case 'recovering':
      return 'treatment'; // Map sick and recovering to treatment
    case 'deceased':
      return 'critical'; // Map deceased to critical
    default:
      return 'healthy'; // fallback
  }
};

// Helper function to format patient data for PatientCard
const formatPatientForCard = (patient: Patient) => ({
  id: patient.id,
  name: patient.name,
  species: patient.species,
  breed: patient.breed || "Не указано",
  age: patient.birthDate 
    ? `${Math.floor((new Date().getTime() - new Date(patient.birthDate).getTime()) / (1000 * 3600 * 24 * 365))} лет`
    : "Не указан",
  owner: "Владелец", // This will be populated when we add relations
  ownerPhone: "",
  status: mapPatientStatus(patient.status),
  lastVisit: new Date(patient.updatedAt).toLocaleDateString('ru-RU')
});

export default function Dashboard() {
  // Fetch dashboard statistics
  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError 
  } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats']
  });

  // Fetch today's appointments
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

  // Fetch recent patients (limited to 5)
  const { 
    data: patients, 
    isLoading: patientsLoading, 
    error: patientsError 
  } = useQuery<Patient[]>({
    queryKey: ['/api/patients', { limit: 5, offset: 0 }],
    queryFn: async () => {
      const response = await fetch('/api/patients?limit=5&offset=0');
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    }
  });

  const todayAppointments = appointments ? appointments.slice(0, 3).map(formatAppointmentForCard) : [];
  const recentPatients = patients ? patients.slice(0, 2).map(formatPatientForCard) : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Дашборд VetSystem</h1>
        <p className="text-muted-foreground">Обзор деятельности клиники</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <StatCardSkeleton />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего пациентов</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsError ? (
                <div className="text-2xl font-bold text-destructive">Ошибка</div>
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-patients">{stats?.totalPatients || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Всего в базе данных
              </p>
            </CardContent>
          </Card>
        )}

        {statsLoading ? (
          <StatCardSkeleton />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Записи на сегодня</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsError ? (
                <div className="text-2xl font-bold text-destructive">Ошибка</div>
              ) : (
                <div className="text-2xl font-bold" data-testid="text-today-appointments">{stats?.todayAppointments || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {stats?.activeAppointments || 0} активных сейчас
              </p>
            </CardContent>
          </Card>
        )}

        {statsLoading ? (
          <StatCardSkeleton />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Выручка за месяц</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsError ? (
                <div className="text-2xl font-bold text-destructive">Ошибка</div>
              ) : (
                <div className="text-2xl font-bold" data-testid="text-revenue">{(stats?.totalRevenue || 0).toLocaleString('ru-RU')} ₽</div>
              )}
              <p className="text-xs text-muted-foreground">
                Оплаченные счета
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
              <CardTitle className="text-sm font-medium">Уведомления</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Долги</span>
                  <Badge variant="destructive" className="text-xs">{stats?.pendingPayments || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Мало товара</span>
                  <Badge variant="secondary" className="text-xs">{stats?.lowStockCount || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Расписание на сегодня
              </CardTitle>
              <Button variant="outline" size="sm" data-testid="button-view-full-schedule">
                Весь день
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
                Ошибка загрузки записей
              </div>
            ) : todayAppointments.length > 0 ? (
              todayAppointments.map(appointment => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Нет записей на сегодня
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Недавние пациенты
              </CardTitle>
              <Button variant="outline" size="sm" data-testid="button-view-all-patients">
                Все пациенты
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {patientsLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <PatientCardSkeleton key={i} />
                ))}
              </div>
            ) : patientsError ? (
              <div className="text-center py-4 text-muted-foreground">
                Ошибка загрузки пациентов
              </div>
            ) : recentPatients.length > 0 ? (
              recentPatients.map(patient => (
                <PatientCard key={patient.id} patient={patient} />
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Нет пациентов в базе данных
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-16 flex-col gap-2" variant="outline" data-testid="button-new-patient">
              <Users className="h-5 w-5" />
              <span>Новый пациент</span>
            </Button>
            <Button className="h-16 flex-col gap-2" variant="outline" data-testid="button-new-appointment">
              <Calendar className="h-5 w-5" />
              <span>Запись на прием</span>
            </Button>
            <Button className="h-16 flex-col gap-2" variant="outline" data-testid="button-new-invoice">
              <DollarSign className="h-5 w-5" />
              <span>Создать счет</span>
            </Button>
            <Button className="h-16 flex-col gap-2" variant="outline" data-testid="button-inventory">
              <Package className="h-5 w-5" />
              <span>Склад</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}