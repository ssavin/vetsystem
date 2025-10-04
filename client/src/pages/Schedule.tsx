import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, Plus, Filter, CalendarDays, Table, Clock } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { type Appointment } from "@shared/schema"
import AppointmentCard from "@/components/AppointmentCard"
import AppointmentDialog from "@/components/AppointmentDialog"
import { AppointmentCardSkeleton } from "@/components/ui/loading-skeletons"
import { DayView, WeekView, MonthView } from "@/components/CalendarViews"

type ViewMode = 'day' | 'week' | 'month'

// Helper function to format date for API
const formatDateForAPI = (date: Date) => {
  return date.toISOString().split('T')[0]
}

// Helper function to map database appointment status to component status
const mapAppointmentStatus = (dbStatus: string | null): 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show' => {
  if (!dbStatus) return 'scheduled'
  
  switch (dbStatus) {
    case 'in_progress':
      return 'in-progress'
    case 'no_show':
      return 'no-show'
    case 'scheduled':
    case 'confirmed':
    case 'completed':
    case 'cancelled':
      return dbStatus as 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
    default:
      return 'scheduled'
  }
}

export default function Schedule() {
  const { t } = useTranslation('schedule')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [selectedDoctor, setSelectedDoctor] = useState(t('filters.allDoctors'))
  const [selectedType, setSelectedType] = useState(t('types.allTypes'))

  // Helper function to format appointment data for AppointmentCard
  const formatAppointmentForCard = (appointment: any) => ({
    id: appointment.id,
    time: new Date(appointment.appointmentDate).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    duration: `${appointment.duration} ${t('duration.minutes')}`,
    appointmentDate: new Date(appointment.appointmentDate),
    patientName: appointment.patientName || t('defaultNames.patient'),
    patientSpecies: appointment.patientSpecies || t('defaultNames.animal'),
    ownerName: appointment.ownerName || t('defaultNames.owner'),
    doctorName: appointment.doctorName || t('defaultNames.doctor'),
    appointmentType: appointment.appointmentType,
    status: mapAppointmentStatus(appointment.status),
    notes: appointment.notes || ""
  })

  // Filter options - will be populated from actual data
  const appointmentTypes = [
    t('types.allTypes'),
    t('types.examination'),
    t('types.surgery'),
    t('types.consultation'),
    t('types.diagnostics'),
    t('types.vaccination')
  ]

  // Helper functions for date range queries
  const getWeekRange = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)

    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek)
      weekDay.setDate(startOfWeek.getDate() + i)
      week.push(formatDateForAPI(weekDay))
    }
    return { start: week[0], end: week[6] }
  }

  const getMonthRange = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    return { 
      start: formatDateForAPI(firstDay), 
      end: formatDateForAPI(lastDay) 
    }
  }

  // Fetch appointments based on view mode
  const { 
    data: appointments, 
    isLoading: appointmentsLoading, 
    error: appointmentsError 
  } = useQuery<any[]>({
    queryKey: ['/api/appointments', { 
      viewMode, 
      date: formatDateForAPI(currentDate),
      ...(viewMode === 'week' && { weekRange: getWeekRange(currentDate) }),
      ...(viewMode === 'month' && { monthRange: getMonthRange(currentDate) })
    }],
    queryFn: async () => {
      let url = '/api/appointments'
      
      if (viewMode === 'day') {
        // Single day query
        url += `?date=${formatDateForAPI(currentDate)}`
      } else {
        // For week and month views, fetch all appointments 
        // and filter on frontend for better performance
        url += ''
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch appointments')
      return response.json()
    }
  })

  // Filter appointments based on date range and filters
  const getFilteredAppointments = () => {
    if (!appointments) return []
    
    let filtered = appointments.map(formatAppointmentForCard)
    
    // Filter by date range based on view mode
    if (viewMode === 'week') {
      const weekRange = getWeekRange(currentDate)
      const startDate = new Date(weekRange.start)
      const endDate = new Date(weekRange.end)
      endDate.setHours(23, 59, 59, 999) // Include the full end day
      
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointmentDate)
        return aptDate >= startDate && aptDate <= endDate
      })
    } else if (viewMode === 'month') {
      const monthRange = getMonthRange(currentDate)
      const startDate = new Date(monthRange.start)
      const endDate = new Date(monthRange.end)
      endDate.setHours(23, 59, 59, 999) // Include the full end day
      
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointmentDate)
        return aptDate >= startDate && aptDate <= endDate
      })
    }
    // For day view, the backend already filters by date
    
    // Apply doctor filter
    if (selectedDoctor !== t('filters.allDoctors')) {
      filtered = filtered.filter(apt => apt.doctorName === selectedDoctor)
    }
    
    // Apply appointment type filter
    if (selectedType !== t('types.allTypes')) {
      filtered = filtered.filter(apt => apt.appointmentType === selectedType)
    }
    
    return filtered
  }

  // Get filtered appointments for display
  const formattedAppointments = getFilteredAppointments()
  
  // Get unique doctors from appointments for filter
  const doctors = [t('filters.allDoctors'), ...Array.from(new Set(formattedAppointments.map(apt => apt.doctorName).filter(Boolean)))]

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
          <h1 className="text-3xl font-bold" data-testid="text-schedule-title">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
              data-testid="button-view-day"
            >
              <Clock className="h-4 w-4 mr-1" />
              День
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              data-testid="button-view-week"
            >
              <Table className="h-4 w-4 mr-1" />
              Неделя
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              data-testid="button-view-month"
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Месяц
            </Button>
          </div>
          <AppointmentDialog defaultDate={currentDate} />
        </div>
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
                  {formattedAppointments.length}
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
                  {formattedAppointments.filter((a: any) => a.status === 'confirmed').length}
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
                  {formattedAppointments.filter((a: any) => a.status === 'in-progress').length}
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
                  {formattedAppointments.filter((a: any) => a.status === 'scheduled').length}
                </p>
                <p className="text-xs text-muted-foreground">Запланировано</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Views */}
      <Card>
        <CardHeader>
          <CardTitle>
            {
              viewMode === 'day' ? `Записи на ${currentDate.toLocaleDateString('ru-RU')}` :
              viewMode === 'week' ? 'Расписание на неделю' :
              'Календарь записей'
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'day' && (
            <DayView
              appointments={formattedAppointments}
              currentDate={currentDate}
              viewMode={viewMode}
              onDateChange={setCurrentDate}
              loading={appointmentsLoading}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              appointments={formattedAppointments}
              currentDate={currentDate}
              viewMode={viewMode}
              onDateChange={setCurrentDate}
              loading={appointmentsLoading}
            />
          )}
          {viewMode === 'month' && (
            <MonthView
              appointments={formattedAppointments}
              currentDate={currentDate}
              viewMode={viewMode}
              onDateChange={setCurrentDate}
              loading={appointmentsLoading}
            />
          )}
          
          {/* Fallback for errors */}
          {appointmentsError && (
            <div className="text-center py-8 text-muted-foreground">
              Ошибка загрузки расписания
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}