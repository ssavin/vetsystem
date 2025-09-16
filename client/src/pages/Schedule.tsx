import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react"
import AppointmentCard from "@/components/AppointmentCard"

// TODO: Remove mock data when connecting to real backend
const mockAppointments = [
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
  },
  {
    id: "4",
    time: "11:00",
    duration: "60 мин",
    patientName: "Бобик",
    patientSpecies: "Собака",
    ownerName: "Козлова М.А.",
    doctorName: "Доктор Петрова",
    appointmentType: "Диагностика",
    status: 'confirmed' as const,
    notes: "УЗИ брюшной полости"
  }
]

const doctors = ["Все врачи", "Доктор Петрова", "Доктор Иванов", "Доктор Сидоров"]
const appointmentTypes = ["Все типы", "Осмотр", "Операция", "Консультация", "Диагностика", "Вакцинация"]

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDoctor, setSelectedDoctor] = useState("Все врачи")
  const [selectedType, setSelectedType] = useState("Все типы")

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    })
  }

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    setCurrentDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-schedule-title">Расписание приемов</h1>
          <p className="text-muted-foreground">Управление записями и расписанием врачей</p>
        </div>
        <Button data-testid="button-new-appointment">
          <Plus className="h-4 w-4 mr-2" />
          Новая запись
        </Button>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={goToPreviousDay}
                data-testid="button-previous-day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <h2 className="text-xl font-semibold" data-testid="text-current-date">
                  {formatDate(currentDate)}
                </h2>
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={goToNextDay}
                data-testid="button-next-day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={goToToday}
              data-testid="button-today"
            >
              Сегодня
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Врач:</span>
              <div className="flex gap-1">
                {doctors.map(doctor => (
                  <Badge
                    key={doctor}
                    variant={selectedDoctor === doctor ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedDoctor(doctor)}
                    data-testid={`filter-doctor-${doctor.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {doctor}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Тип:</span>
              <div className="flex gap-1">
                {appointmentTypes.map(type => (
                  <Badge
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedType(type)}
                    data-testid={`filter-type-${type.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-appointments">
                  {mockAppointments.length}
                </p>
                <p className="text-xs text-muted-foreground">Всего записей</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-confirmed-appointments">
                  {mockAppointments.filter(a => a.status === 'confirmed').length}
                </p>
                <p className="text-xs text-muted-foreground">Подтверждено</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-in-progress-appointments">
                  {mockAppointments.filter(a => a.status === 'in-progress').length}
                </p>
                <p className="text-xs text-muted-foreground">В процессе</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-scheduled-appointments">
                  {mockAppointments.filter(a => a.status === 'scheduled').length}
                </p>
                <p className="text-xs text-muted-foreground">Запланировано</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle>Записи на {currentDate.toLocaleDateString('ru-RU')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mockAppointments.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}