import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, User, Stethoscope, FileText, Pill, Syringe, AlertTriangle } from "lucide-react"
import { useState } from "react"

interface MedicalRecordProps {
  record: {
    id: string
    date: string
    patientName: string
    doctorName: string
    visitType: string
    complaints: string
    diagnosis: string
    treatment: string[]
    medications: Array<{
      name: string
      dosage: string
      frequency: string
      duration: string
    }>
    nextVisit?: string
    status: 'active' | 'completed' | 'follow-up'
    notes?: string
    temperature?: string
    weight?: string
  }
}

export default function MedicalRecordCard({ record }: MedicalRecordProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
          text: 'Активное лечение'
        }
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          text: 'Завершено'
        }
      case 'follow-up':
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
          text: 'Требует наблюдения'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
          text: 'Неизвестно'
        }
    }
  }

  const statusConfig = getStatusConfig(record.status)

  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg" data-testid={`text-record-date-${record.id}`}>
                {record.date}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {record.visitType} • {record.patientName}
              </p>
            </div>
          </div>
          <Badge className={statusConfig.color} data-testid={`status-record-${record.id}`}>
            {statusConfig.text}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-3 w-3" />
          <span>Врач: {record.doctorName}</span>
        </div>

        {(record.temperature || record.weight) && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            {record.temperature && (
              <span>Температура: {record.temperature}°C</span>
            )}
            {record.weight && (
              <span>Вес: {record.weight} кг</span>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 mt-0.5 text-red-500" />
            <div>
              <p className="text-sm font-medium">Жалобы:</p>
              <p className="text-sm text-muted-foreground">{record.complaints}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Stethoscope className="h-3 w-3 mt-0.5 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Диагноз:</p>
              <p className="text-sm text-muted-foreground">{record.diagnosis}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Проведенное лечение:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {record.treatment.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {record.medications.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Pill className="h-3 w-3" />
              Назначенные препараты:
            </p>
            <div className="grid gap-2">
              {record.medications.map((med, index) => (
                <div key={index} className="p-2 bg-muted rounded-md text-sm">
                  <p className="font-medium">{med.name}</p>
                  <p className="text-muted-foreground">
                    {med.dosage} • {med.frequency} • {med.duration}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {record.nextVisit && (
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
            <p className="text-sm flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Следующий визит: {record.nextVisit}
            </p>
          </div>
        )}

        {record.notes && isExpanded && (
          <div className="p-2 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">Дополнительные заметки:</p>
            <p className="text-sm text-muted-foreground">{record.notes}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid={`button-expand-record-${record.id}`}
          >
            <FileText className="h-3 w-3 mr-1" />
            {isExpanded ? 'Свернуть' : 'Подробнее'}
          </Button>
          <Button size="sm" variant="outline" data-testid={`button-edit-record-${record.id}`}>
            Редактировать
          </Button>
          <Button size="sm" data-testid={`button-print-record-${record.id}`}>
            Печать
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}