import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, User, Stethoscope, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { useState } from "react"

interface AppointmentCardProps {
  appointment: {
    id: string
    time: string
    duration: string
    patientName: string
    patientSpecies: string
    ownerName: string
    doctorName: string
    appointmentType: string
    status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show'
    notes?: string
  }
}

export default function AppointmentCard({ appointment }: AppointmentCardProps) {
  const [currentStatus, setCurrentStatus] = useState(appointment.status)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled':
        return {
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
          text: 'Запланирован',
          icon: Clock
        }
      case 'confirmed':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          text: 'Подтвержден',
          icon: CheckCircle
        }
      case 'in-progress':
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
          text: 'Идет прием',
          icon: Stethoscope
        }
      case 'completed':
        return {
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
          text: 'Завершен',
          icon: CheckCircle
        }
      case 'cancelled':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
          text: 'Отменен',
          icon: XCircle
        }
      case 'no-show':
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
          text: 'Неявка',
          icon: AlertCircle
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
          text: 'Неизвестно',
          icon: Clock
        }
    }
  }

  const statusConfig = getStatusConfig(currentStatus)
  const StatusIcon = statusConfig.icon

  const handleStatusChange = (newStatus: typeof appointment.status) => {
    setCurrentStatus(newStatus)
    console.log(`Appointment ${appointment.id} status changed to ${newStatus}`)
  }

  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold" data-testid={`text-appointment-time-${appointment.id}`}>
              {appointment.time}
            </div>
            <div className="text-sm text-muted-foreground">
              ({appointment.duration})
            </div>
          </div>
          <Badge className={statusConfig.color} data-testid={`status-appointment-${appointment.id}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.text}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{appointment.patientName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium" data-testid={`text-patient-name-${appointment.id}`}>
              {appointment.patientName} ({appointment.patientSpecies})
            </div>
            <div className="text-sm text-muted-foreground">
              Владелец: {appointment.ownerName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Stethoscope className="h-3 w-3" />
            <span>Врач: {appointment.doctorName}</span>
          </div>
          <div className="text-muted-foreground">
            {appointment.appointmentType}
          </div>
        </div>

        {appointment.notes && (
          <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
            {appointment.notes}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {currentStatus === 'scheduled' && (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleStatusChange('confirmed')}
                data-testid={`button-confirm-${appointment.id}`}
              >
                Подтвердить
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleStatusChange('cancelled')}
                data-testid={`button-cancel-${appointment.id}`}
              >
                Отменить
              </Button>
            </>
          )}
          {currentStatus === 'confirmed' && (
            <Button 
              size="sm" 
              onClick={() => handleStatusChange('in-progress')}
              data-testid={`button-start-${appointment.id}`}
            >
              Начать прием
            </Button>
          )}
          {currentStatus === 'in-progress' && (
            <Button 
              size="sm" 
              onClick={() => handleStatusChange('completed')}
              data-testid={`button-complete-${appointment.id}`}
            >
              Завершить
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}