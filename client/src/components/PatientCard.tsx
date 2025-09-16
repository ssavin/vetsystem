import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, User, Phone, FileText } from "lucide-react"
import { useState } from "react"

interface PatientCardProps {
  patient: {
    id: string
    name: string
    species: string
    breed: string
    age: string
    owner: string
    ownerPhone: string
    status: 'healthy' | 'treatment' | 'critical'
    lastVisit?: string
    avatar?: string
  }
}

export default function PatientCard({ patient }: PatientCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'treatment': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Здоров'
      case 'treatment': return 'Лечение'
      case 'critical': return 'Критическое'
      default: return 'Неизвестно'
    }
  }

  return (
    <Card className="hover-elevate cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={patient.avatar} />
              <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg" data-testid={`text-patient-name-${patient.id}`}>
                {patient.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {patient.species} • {patient.breed} • {patient.age}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(patient.status)} data-testid={`status-patient-${patient.id}`}>
            {getStatusText(patient.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{patient.owner}</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>{patient.ownerPhone}</span>
          </div>
        </div>
        
        {patient.lastVisit && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <Calendar className="h-3 w-3" />
            <span>Последний визит: {patient.lastVisit}</span>
          </div>
        )}
        
        {isExpanded && (
          <div className="flex gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" data-testid={`button-view-records-${patient.id}`}>
              <FileText className="h-3 w-3 mr-1" />
              Мед. карта
            </Button>
            <Button size="sm" variant="outline" data-testid={`button-schedule-appointment-${patient.id}`}>
              <Calendar className="h-3 w-3 mr-1" />
              Записать
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}