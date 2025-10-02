import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Plus, Filter, Calendar, Brain, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import MedicalRecordCard from "@/components/MedicalRecordCard"
import MedicalRecordForm from "@/components/MedicalRecordForm"
import AIAssistant from "@/components/AIAssistant"
import type { MedicalRecord } from "@shared/schema"
import { Badge } from "@/components/ui/badge"


export default function MedicalRecords() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [selectedPatientForAI, setSelectedPatientForAI] = useState<any>(null)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const { toast } = useToast()

  // Get patientId from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const patientId = params.get('patientId')
    if (patientId) {
      setSelectedPatientId(patientId)
    }
  }, [])

  // Fetch medical records with patients, doctors, and medications
  const { data: medicalRecords = [], isLoading, error } = useQuery({
    queryKey: ['/api/medical-records'],
  })

  // Fetch patients and doctors for display names
  const { data: patients = [] } = useQuery({
    queryKey: ['/api/patients'],
  })

  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
  })

  // Create lookup maps for patient and doctor names
  const patientMap = useMemo(() => {
    const map: Record<string, any> = {}
    patients.forEach((patient: any) => {
      map[patient.id] = patient
    })
    return map
  }, [patients])

  const doctorMap = useMemo(() => {
    const map: Record<string, any> = {}
    doctors.forEach((doctor: any) => {
      map[doctor.id] = doctor
    })
    return map
  }, [doctors])

  // Transform medical records to include display data
  const transformedRecords = useMemo(() => {
    return medicalRecords.map((record: MedicalRecord) => {
      const patient = patientMap[record.patientId]
      const doctor = record.doctorId ? doctorMap[record.doctorId] : null
      
      const visitDate = new Date(record.visitDate)
      const isValidVisitDate = !isNaN(visitDate.getTime())
      
      const nextVisitDate = record.nextVisit ? new Date(record.nextVisit) : null
      const isValidNextVisit = nextVisitDate && !isNaN(nextVisitDate.getTime())
      
      return {
        ...record,
        patientId: record.patientId,
        date: isValidVisitDate ? visitDate.toLocaleDateString('ru-RU') : 'Дата не указана',
        patientName: patient ? patient.name : 'Неизвестный пациент',
        doctorName: doctor ? doctor.name : 'Неизвестный врач',
        medications: [], // TODO: Fetch medications separately if needed
        nextVisit: isValidNextVisit ? nextVisitDate.toLocaleDateString('ru-RU') : undefined,
        treatment: Array.isArray(record.treatment) ? record.treatment : []
      }
    })
  }, [medicalRecords, patientMap, doctorMap])

  // Filter records based on search term and selected patient
  const filteredRecords = useMemo(() => {
    let records = transformedRecords

    // Filter by selected patient first
    if (selectedPatientId) {
      records = records.filter(record => record.patientId === selectedPatientId)
    }

    // Then apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      records = records.filter(record => 
        record.patientName?.toLowerCase().includes(searchLower) ||
        record.doctorName?.toLowerCase().includes(searchLower) ||
        record.diagnosis?.toLowerCase().includes(searchLower) ||
        record.visitType?.toLowerCase().includes(searchLower)
      )
    }

    return records
  }, [transformedRecords, searchTerm, selectedPatientId])

  // Get selected patient name
  const selectedPatientName = useMemo(() => {
    if (!selectedPatientId) return null
    const patient = patientMap[selectedPatientId]
    return patient ? patient.name : null
  }, [selectedPatientId, patientMap])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  const handleFiltersClick = () => {
    toast({
      title: "Фильтры",
      description: "Функция фильтрации находится в разработке",
    })
  }

  const handlePeriodClick = () => {
    toast({
      title: "Выбор периода",
      description: "Функция выбора временного периода находится в разработке",
    })
  }

  const handleAIAssistantToggle = () => {
    if (!showAIAssistant && !selectedPatientForAI) {
      toast({
        title: "Выберите пациента",
        description: "Для использования ИИ-помощника необходимо выбрать пациента",
        variant: "destructive",
      })
      return
    }
    setShowAIAssistant(!showAIAssistant)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-medical-records-title">Электронные медицинские карты</h1>
          <p className="text-muted-foreground">История болезней и медицинские записи пациентов</p>
        </div>
        <MedicalRecordForm />
      </div>

      {selectedPatientName && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm py-2 px-3">
            Пациент: {selectedPatientName}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
              onClick={() => {
                setSelectedPatientId(null)
                window.history.pushState({}, '', '/medical-records')
              }}
              data-testid="button-clear-patient-filter"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Поиск медицинских записей</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по пациенту, врачу или диагнозу..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-records"
              />
            </div>
            <Button variant="outline" onClick={handleFiltersClick} data-testid="button-filter-records">
              <Filter className="h-4 w-4 mr-2" />
              Фильтры
            </Button>
            <Button variant="outline" onClick={handlePeriodClick} data-testid="button-date-range">
              <Calendar className="h-4 w-4 mr-2" />
              Период
            </Button>
            <Button
              variant={showAIAssistant ? "default" : "outline"}
              onClick={handleAIAssistantToggle}
              data-testid="button-toggle-ai"
            >
              <Brain className="h-4 w-4 mr-2" />
              ИИ-Помощник
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ИИ-Помощник */}
      {showAIAssistant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              Ветеринарный ИИ-Помощник
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AIAssistant 
              patientData={selectedPatientForAI}
              onSuggestionApply={(suggestion) => {
                console.log('Применяем рекомендацию ИИ:', suggestion)
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
{isLoading ? (
                <Skeleton className="h-8 w-8 mx-auto" />
              ) : (
                <p className="text-2xl font-bold text-blue-600" data-testid="text-active-treatments">
                  {transformedRecords.filter(r => r.status === 'active').length}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Активное лечение</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-8 mx-auto" />
              ) : (
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-follow-up">
                  {transformedRecords.filter(r => r.status === 'follow_up_required').length}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Требует наблюдения</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-8 mx-auto" />
              ) : (
                <p className="text-2xl font-bold text-green-600" data-testid="text-completed-treatments">
                  {transformedRecords.filter(r => r.status === 'completed').length}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Завершенных случаев</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medical Records List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-destructive">
              Ошибка загрузки медицинских записей: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {filteredRecords.map((record, index) => (
              <MedicalRecordCard key={record.id || `record-${index}`} record={record} />
            ))}
          </div>

          {filteredRecords.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Медицинские записи не найдены' : 'Медицинские записи отсутствуют'}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}