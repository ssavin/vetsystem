import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface AppointmentData {
  id: string
  time: string
  duration: string
  appointmentDate: Date
  patientName: string
  patientSpecies: string
  ownerName: string
  doctorName: string
  appointmentType: string
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
}

interface CalendarViewsProps {
  appointments: AppointmentData[]
  currentDate: Date
  viewMode: 'day' | 'week' | 'month'
  onDateChange: (date: Date) => void
  onAppointmentClick?: (appointment: AppointmentData) => void
  loading?: boolean
}

// Day view - detailed schedule for one day
export function DayView({ appointments, currentDate, onDateChange, onAppointmentClick, loading }: CalendarViewsProps) {
  const timeSlots = Array.from({ length: 17 }, (_, i) => `${8 + i}:00`)

  const getAppointmentsForTimeSlot = (timeSlot: string) => {
    return appointments.filter(apt => {
      const aptHour = parseInt(apt.time.split(':')[0])
      const slotHour = parseInt(timeSlot.split(':')[0])
      return aptHour === slotHour
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'no-show': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-2">
      {timeSlots.map(timeSlot => {
        const slotAppointments = getAppointmentsForTimeSlot(timeSlot)
        
        return (
          <div key={timeSlot} className="grid grid-cols-12 gap-4 min-h-16 border-b border-border/30">
            <div className="col-span-2 flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">
                {timeSlot}
              </span>
            </div>
            <div className="col-span-10 space-y-2 py-2">
              {loading ? (
                <div className="h-12 bg-muted animate-pulse rounded" />
              ) : slotAppointments.length > 0 ? (
                slotAppointments.map(appointment => (
                  <div 
                    key={appointment.id}
                    className="p-3 rounded border hover-elevate cursor-pointer"
                    onClick={() => onAppointmentClick?.(appointment)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{appointment.time}</span>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status === 'scheduled' ? 'Запланирован' : 
                           appointment.status === 'confirmed' ? 'Подтвержден' :
                           appointment.status === 'in-progress' ? 'Идет прием' :
                           appointment.status === 'completed' ? 'Завершен' :
                           appointment.status === 'cancelled' ? 'Отменен' : 'Неявка'}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{appointment.duration}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{appointment.patientName}</span>
                      <span className="text-muted-foreground"> • {appointment.appointmentType}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {appointment.doctorName} • {appointment.ownerName}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Свободно
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Week view - 7-day grid
export function WeekView({ appointments, currentDate, onDateChange, onAppointmentClick, loading }: CalendarViewsProps) {
  const getWeekDates = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is Sunday
    startOfWeek.setDate(diff)

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
  }

  const weekDates = getWeekDates(currentDate)
  const timeSlots = Array.from({ length: 17 }, (_, i) => `${8 + i}:00`)

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate)
      return formatDateForAPI(date) === formatDateForAPI(aptDate)
    })
  }
  
  const getAppointmentsForTimeSlot = (date: Date, timeSlot: string) => {
    const dayAppointments = getAppointmentsForDate(date)
    return dayAppointments.filter(apt => {
      const aptHour = parseInt(apt.time.split(':')[0])
      const slotHour = parseInt(timeSlot.split(':')[0])
      return aptHour === slotHour
    })
  }

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    onDateChange(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    onDateChange(newDate)
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">
          {weekDates[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - 
          {weekDates[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <Button variant="outline" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-8 gap-2 text-sm">
        <div></div> {/* Empty corner */}
        {weekDates.map(date => (
          <div key={date.toISOString()} className="text-center p-2 font-medium">
            <div>{date.toLocaleDateString('ru-RU', { weekday: 'short' })}</div>
            <div className="text-lg">{date.getDate()}</div>
          </div>
        ))}
        
        {timeSlots.map(time => (
          <div key={time} className="contents">
            <div className="p-2 text-right text-muted-foreground border-r">
              {time}
            </div>
            {weekDates.map(date => {
              const slotAppointments = getAppointmentsForTimeSlot(date, time)
              return (
                <div key={`${time}-${date.toISOString()}`} className="p-1 border border-border/30 min-h-12">
                  {loading ? (
                    <div className="h-8 bg-muted animate-pulse rounded" />
                  ) : slotAppointments.length > 0 ? (
                    slotAppointments.map(apt => (
                      <div 
                        key={apt.id} 
                        className="text-xs p-1 bg-primary/10 rounded mb-1 cursor-pointer hover-elevate"
                        onClick={() => onAppointmentClick?.(apt)}
                      >
                        {apt.time} {apt.patientName}
                      </div>
                    ))
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// Month view - calendar grid 
export function MonthView({ appointments, currentDate, onDateChange, onAppointmentClick, loading }: CalendarViewsProps) {
  
  const getMonthDates = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const dates = []
    const current = new Date(startDate)
    
    while (dates.length < 42) { // 6 weeks * 7 days
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return dates
  }

  const monthDates = getMonthDates(currentDate)
  const monthName = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    onDateChange(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    onDateChange(newDate)
  }

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate).toDateString()
      const checkDate = date.toDateString()
      return aptDate === checkDate
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold capitalize">{monthName}</h2>
        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-2">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
          <div key={day} className="text-center font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {monthDates.map(date => {
          const dayAppointments = getAppointmentsForDate(date)
          const isCurrentMonthDate = isCurrentMonth(date)
          const isTodayDate = isToday(date)
          
          return (
            <div 
              key={date.toISOString()}
              className={`
                min-h-24 p-2 border rounded cursor-pointer hover-elevate
                ${isTodayDate ? 'bg-primary/10 border-primary' : 'border-border'}
                ${!isCurrentMonthDate ? 'text-muted-foreground bg-muted/30' : ''}
              `}
              onClick={() => onDateChange(date)}
            >
              <div className="font-medium mb-1">
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {loading ? (
                  <div className="h-4 bg-muted animate-pulse rounded" />
                ) : (
                  <>
                    {dayAppointments.slice(0, 2).map(apt => (
                      <div 
                        key={apt.id} 
                        className="text-xs p-1 bg-primary/20 rounded truncate cursor-pointer hover:bg-primary/30"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAppointmentClick?.(apt)
                        }}
                      >
                        {apt.time} {apt.patientName}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayAppointments.length - 2} ещё
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}