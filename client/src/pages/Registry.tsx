import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Plus, Filter, FileText, Calendar, Phone, User } from "lucide-react"
import PatientRegistrationForm from "@/components/PatientRegistrationForm"
import { useLocation } from "wouter"

// Helper functions for patient status
const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'healthy': return 'outline'
    case 'treatment': return 'secondary' 
    case 'critical': return 'destructive'
    default: return 'default'
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

interface PatientTableRowProps {
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

function PatientTableRow({ patient }: PatientTableRowProps) {
  const [, navigate] = useLocation()

  return (
    <TableRow className="hover-elevate">
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={patient.avatar} />
            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium" data-testid={`text-patient-name-${patient.id}`}>
              {patient.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {patient.age}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <div className="font-medium">{patient.species}</div>
          <div className="text-muted-foreground">{patient.breed}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span data-testid={`text-owner-${patient.id}`}>{patient.owner}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3" />
          <span data-testid={`text-phone-${patient.id}`}>{patient.ownerPhone}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(patient.status)} data-testid={`status-patient-${patient.id}`}>
          {getStatusText(patient.status)}
        </Badge>
      </TableCell>
      <TableCell>
        {patient.lastVisit && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span data-testid={`text-last-visit-${patient.id}`}>{patient.lastVisit}</span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-1 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              navigate('/medical-records')
            }}
            data-testid={`button-view-records-${patient.id}`}
          >
            <FileText className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              navigate('/schedule')
            }}
            data-testid={`button-schedule-appointment-${patient.id}`}
          >
            <Calendar className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// TODO: Remove mock data when connecting to real backend
const mockPatients = [
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
  },
  {
    id: "3",
    name: "Мурка",
    species: "Кошка",
    breed: "Британская",
    age: "2 года",
    owner: "Петрова А.С.",
    ownerPhone: "+7 (999) 555-12-34",
    status: 'healthy' as const,
    lastVisit: "12.12.2024"
  }
]

export default function Registry() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [filteredPatients, setFilteredPatients] = useState(mockPatients)

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (!term) {
      setFilteredPatients(mockPatients)
    } else {
      const filtered = mockPatients.filter(patient => 
        patient.name.toLowerCase().includes(term.toLowerCase()) ||
        patient.owner.toLowerCase().includes(term.toLowerCase()) ||
        patient.ownerPhone.includes(term)
      )
      setFilteredPatients(filtered)
    }
  }

  if (showRegistrationForm) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Регистрация нового пациента</h1>
            <p className="text-muted-foreground">Добавление животного в базу данных</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowRegistrationForm(false)}
            data-testid="button-back-to-registry"
          >
            Назад к списку
          </Button>
        </div>
        <PatientRegistrationForm />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-registry-title">Регистратура</h1>
          <p className="text-muted-foreground">Управление клиентской базой и пациентами</p>
        </div>
        <Button 
          onClick={() => setShowRegistrationForm(true)}
          data-testid="button-new-patient"
        >
          <Plus className="h-4 w-4 mr-2" />
          Новый пациент
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Поиск пациентов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по кличке, владельцу или телефону..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-patients"
              />
            </div>
            <Button variant="outline" data-testid="button-filters">
              <Filter className="h-4 w-4 mr-2" />
              Фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пациент</TableHead>
                <TableHead>Вид/Порода</TableHead>
                <TableHead>Владелец</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Последний визит</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map(patient => (
                <PatientTableRow key={patient.id} patient={patient} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredPatients.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? 'Пациенты не найдены' : 'Пациенты отсутствуют'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}