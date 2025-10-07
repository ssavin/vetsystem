import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation('medicalRecords')
  const [searchTerm, setSearchTerm] = useState("")
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [selectedPatientForAI, setSelectedPatientForAI] = useState<any>(null)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 50
  const { toast } = useToast()

  // Get patientId from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const patientId = params.get('patientId')
    if (patientId) {
      setSelectedPatientId(patientId)
      setPage(0) // Reset page when patient changes
    }
  }, [])

  // Reset page when patient filter changes
  useEffect(() => {
    setPage(0)
  }, [selectedPatientId])

  // Fetch medical records with pagination
  const { data, isLoading, error } = useQuery<{
    records: MedicalRecord[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  }>({
    queryKey: ['/api/medical-records', page, selectedPatientId],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
        ...(selectedPatientId && { patientId: selectedPatientId })
      });
      const response = await fetch(`/api/medical-records?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch medical records');
      return response.json();
    }
  })

  const medicalRecords = data?.records || []
  const pagination = data?.pagination || { total: 0, limit: pageSize, offset: 0, hasMore: false }

  // Fetch patients for current page of medical records
  const patientIds = useMemo(() => {
    return Array.from(new Set(medicalRecords.map((record: MedicalRecord) => record.patientId))).filter(Boolean)
  }, [medicalRecords])

  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ['/api/patients/batch', patientIds],
    queryFn: async () => {
      if (patientIds.length === 0) return []
      const response = await fetch('/api/patients/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: patientIds })
      });
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    },
    enabled: patientIds.length > 0
  })

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  })

  // Filter only doctors from users
  const doctors = useMemo(() => {
    if (!Array.isArray(users)) return []
    return users.filter((user: any) => user.role === 'врач' || user.role === 'doctor')
  }, [users])

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
        date: isValidVisitDate ? visitDate.toLocaleDateString('ru-RU') : t('unknownDate'),
        patientName: patient ? patient.name : t('unknownPatient'),
        doctorName: doctor ? doctor.name : t('unknownDoctor'),
        medications: [],
        nextVisit: isValidNextVisit ? nextVisitDate.toLocaleDateString('ru-RU') : undefined,
        treatment: Array.isArray(record.treatment) ? record.treatment : []
      }
    })
  }, [medicalRecords, patientMap, doctorMap, t])

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
      title: t('filtersTitle'),
      description: t('filtersDescription'),
    })
  }

  const handlePeriodClick = () => {
    toast({
      title: t('periodTitle'),
      description: t('periodDescription'),
    })
  }

  const handleAIAssistantToggle = () => {
    if (!showAIAssistant && !selectedPatientForAI) {
      toast({
        title: t('selectPatientTitle'),
        description: t('selectPatientDescription'),
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
          <h1 className="text-3xl font-bold" data-testid="text-medical-records-title">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <MedicalRecordForm />
      </div>

      {selectedPatientName && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm py-2 px-3">
            {t('showingForPatient')}: {selectedPatientName}
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
          <CardTitle>{t('searchTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-records"
              />
            </div>
            <Button variant="outline" onClick={handleFiltersClick} data-testid="button-filter-records">
              <Filter className="h-4 w-4 mr-2" />
              {t('filtersButton')}
            </Button>
            <Button variant="outline" onClick={handlePeriodClick} data-testid="button-date-range">
              <Calendar className="h-4 w-4 mr-2" />
              {t('periodButton')}
            </Button>
            <Button
              variant={showAIAssistant ? "default" : "outline"}
              onClick={handleAIAssistantToggle}
              data-testid="button-toggle-ai"
            >
              <Brain className="h-4 w-4 mr-2" />
              {t('aiAssistant')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showAIAssistant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              {t('aiAssistantTitle')}
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

          {/* Pagination Controls */}
          {pagination.total > pageSize && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Показано {page * pageSize + 1}-{Math.min((page + 1) * pageSize, pagination.total)} из {pagination.total}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      data-testid="button-prev-page"
                    >
                      Назад
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!pagination.hasMore}
                      data-testid="button-next-page"
                    >
                      Вперёд
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}