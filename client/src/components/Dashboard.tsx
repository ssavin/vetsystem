import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Calendar, Clock, TrendingUp, AlertCircle, CheckCircle, DollarSign, Package } from "lucide-react"
import PatientCard from "./PatientCard"
import AppointmentCard from "./AppointmentCard"

// TODO: Remove mock data when connecting to real backend
const mockStats = {
  totalPatients: 1247,
  todayAppointments: 23,
  activeAppointments: 7,
  revenue: 145600,
  pendingPayments: 12,
  lowStock: 5
}

const mockTodayAppointments = [
  {
    id: "1",
    time: "09:00",
    duration: "30 мин",
    patientName: "Барсик",
    patientSpecies: "Кот",
    ownerName: "Иванов И.И.",
    doctorName: "Доктор Петрова",
    appointmentType: "Осмотр",
    status: 'in-progress' as const,
    notes: "Плановая вакцинация"
  },
  {
    id: "2",
    time: "09:30",
    duration: "45 мин",
    patientName: "Рекс",
    patientSpecies: "Собака",
    ownerName: "Сидоров П.К.",
    doctorName: "Доктор Иванов",
    appointmentType: "Операция",
    status: 'confirmed' as const,
    notes: "Кастрация"
  },
  {
    id: "3",
    time: "10:15",
    duration: "20 мин",
    patientName: "Мурка",
    patientSpecies: "Кошка",
    ownerName: "Петрова А.С.",
    doctorName: "Доктор Сидоров",
    appointmentType: "Консультация",
    status: 'scheduled' as const
  }
]

const mockRecentPatients = [
  {
    id: "1",
    name: "Барсик",
    species: "Кот",
    breed: "Персидская",
    age: "3 года",
    owner: "Иванов И.И.",
    ownerPhone: "+7 (999) 123-45-67",
    status: 'healthy' as const,
    lastVisit: "15.12.2024"
  },
  {
    id: "2",
    name: "Рекс",
    species: "Собака",
    breed: "Немецкая овчарка",
    age: "5 лет",
    owner: "Сидоров П.К.",
    ownerPhone: "+7 (999) 987-65-43",
    status: 'treatment' as const,
    lastVisit: "14.12.2024"
  }
]

export default function Dashboard() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Дашборд VetSystem</h1>
        <p className="text-muted-foreground">Обзор деятельности клиники</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего пациентов</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-patients">{mockStats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              +12 за эту неделю
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Записи на сегодня</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-appointments">{mockStats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {mockStats.activeAppointments} активных сейчас
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка за месяц</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-revenue">{mockStats.revenue.toLocaleString('ru-RU')} ₽</div>
            <p className="text-xs text-muted-foreground">
              +15% к прошлому месяцу
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Уведомления</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Долги</span>
                <Badge variant="destructive" className="text-xs">{mockStats.pendingPayments}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Мало товара</span>
                <Badge variant="secondary" className="text-xs">{mockStats.lowStock}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
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
            {mockTodayAppointments.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
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
            {mockRecentPatients.map(patient => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
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