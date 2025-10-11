import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, User, Stethoscope, CheckCircle, XCircle, AlertCircle, UserCheck } from "lucide-react"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

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
    status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
    notes?: string
  }
}

export default function AppointmentCard({ appointment }: AppointmentCardProps) {
  const { toast } = useToast()

  // Mutation for updating appointment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      return apiRequest('PUT', `/api/appointments/${id}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/appointments'],
        exact: false 
      })
      toast({
        title: "Статус обновлен",
        description: "Статус записи успешно изменен",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка обновления",
        description: error.message || "Не удалось обновить статус",
      })
    }
  })

  // Mutation for check-in
  const checkInMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const response = await apiRequest('POST', `/api/appointments/${appointmentId}/checkin`, {})
      return await response.json()
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/appointments'],
        exact: false 
      })
      queryClient.invalidateQueries({ queryKey: ['/api/queue/entries'] })
      toast({
        title: "Пациент зарегистрирован",
        description: `Номер в очереди: ${data.queueNumber}`,
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка регистрации",
        description: error.message || "Не удалось зарегистрировать прибытие пациента",
      })
    }
  })

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
      case 'in_progress':
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
      case 'no_show':
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

  const statusConfig = getStatusConfig(appointment.status)
  const StatusIcon = statusConfig.icon

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
          {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
            <Button 
              size="sm" 
              variant="default"
              onClick={() => checkInMutation.mutate(appointment.id)}
              disabled={checkInMutation.isPending}
              data-testid={`button-checkin-${appointment.id}`}
            >
              <UserCheck className="h-3 w-3 mr-1" />
              {checkInMutation.isPending ? 'Регистрация...' : 'Регистрация прибытия'}
            </Button>
          )}
          {appointment.status === 'scheduled' && (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'confirmed' })}
                disabled={updateStatusMutation.isPending}
                data-testid={`button-confirm-${appointment.id}`}
              >
                Подтвердить
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'cancelled' })}
                disabled={updateStatusMutation.isPending}
                data-testid={`button-cancel-${appointment.id}`}
              >
                Отменить
              </Button>
            </>
          )}
          {appointment.status === 'confirmed' && (
            <Button 
              size="sm" 
              onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'in_progress' })}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-start-${appointment.id}`}
            >
              Начать прием
            </Button>
          )}
          {appointment.status === 'in_progress' && (
            <Button 
              size="sm" 
              onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'completed' })}
              disabled={updateStatusMutation.isPending}
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