import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Plus, Filter, FileText, Calendar, Phone, User, ClipboardList } from "lucide-react"
import PatientRegistrationForm from "@/components/PatientRegistrationForm"
import CreateCaseDialog from "@/components/CreateCaseDialog"
import { useLocation } from "wouter"
import { Skeleton } from "@/components/ui/skeleton"

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
          <CreateCaseDialog 
            patientId={patient.id} 
            patientName={patient.name}
            trigger={
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => e.stopPropagation()}
                data-testid={`button-create-case-${patient.id}`}
              >
                <ClipboardList className="h-3 w-3 mr-1" />
                Случай
              </Button>
            }
          />
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/medical-records?patientId=${patient.id}`)
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

// Helper function for age word form
function getYearWord(years: number) {
  const lastDigit = years % 10
  const lastTwoDigits = years % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'лет'
  }

  if (lastDigit === 1) {
    return 'год'
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'года'
  }

  return 'лет'
}

export default function Registry() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)

  // Fetch patients and owners from API
  const { data: patientsData = [], isLoading } = useQuery({
    queryKey: ['/api/patients'],
  })

  const { data: ownersData = [] } = useQuery({
    queryKey: ['/api/owners'],
  })

  // Create owner map
  const ownerMap = useMemo(() => {
    const map: Record<string, any> = {}
    ;(ownersData as any[]).forEach((owner: any) => {
      map[owner.id] = owner
    })
    return map
  }, [ownersData])

  // Transform patients to match table format
  const transformedPatients = useMemo(() => {
    return (patientsData as any[]).map((patient: any) => {
      const owner = ownerMap[patient.ownerId]
      const birthDate = patient.birthDate ? new Date(patient.birthDate) : null
      const age = birthDate 
        ? `${Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365))} ${getYearWord(Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365)))}`
        : 'Неизвестно'

      return {
        id: patient.id,
        name: patient.name,
        species: patient.species,
        breed: patient.breed || 'Неизвестна',
        age,
        owner: owner ? owner.name : 'Неизвестен',
        ownerPhone: owner ? owner.phone : '-',
        status: 'healthy' as const, // TODO: Get actual status from medical records
        lastVisit: undefined // TODO: Get from appointments/medical records
      }
    })
  }, [patientsData, ownerMap])

  // Filter patients based on search
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return transformedPatients
    
    const searchLower = searchTerm.toLowerCase()
    return transformedPatients.filter((patient: any) =>
      patient.name?.toLowerCase().includes(searchLower) ||
      patient.owner?.toLowerCase().includes(searchLower) ||
      patient.ownerPhone?.includes(searchTerm)
    )
  }, [transformedPatients, searchTerm])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
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
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Пациенты не найдены' : 'Пациенты отсутствуют'}
              </p>
            </div>
          ) : (
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
                {filteredPatients.map((patient: any) => (
                  <PatientTableRow key={patient.id} patient={patient} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}