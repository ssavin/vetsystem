import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Plus, Filter, Calendar, Brain, X, FileText, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import MedicalRecordCard from "@/components/MedicalRecordCard"
import MedicalRecordForm from "@/components/MedicalRecordForm"
import AIAssistant from "@/components/AIAssistant"
import { AIAssistantWidget } from "@/components/AIAssistantWidget"
import type { MedicalRecord } from "@shared/schema"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PrintDocumentButton } from "@/components/PrintDocumentButton"

// Table row component for medical records
function MedicalRecordTableRow({ record }: { record: any }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', text: 'Активное лечение' }
      case 'completed':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', text: 'Завершено' }
      case 'follow-up':
      case 'follow_up_required':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', text: 'Требует наблюдения' }
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300', text: 'Неизвестно' }
    }
  }

  const statusConfig = getStatusConfig(record.status || 'active')

  return (
    <>
      <TableRow className="hover-elevate" data-testid={`row-medical-record-${record.id}`}>
        <TableCell data-testid={`text-record-date-${record.id}`}>{record.date}</TableCell>
        <TableCell data-testid={`text-patient-name-${record.id}`}>{record.patientName}</TableCell>
        <TableCell data-testid={`text-owner-name-${record.id}`}>{record.ownerName}</TableCell>
        <TableCell data-testid={`text-doctor-name-${record.id}`}>{record.doctorName}</TableCell>
        <TableCell>{record.visitTypeLabel || record.visitType}</TableCell>
        <TableCell className="max-w-xs truncate" title={record.diagnosis || ''}>
          {record.diagnosis || '-'}
        </TableCell>
        <TableCell>
          <Badge className={statusConfig.color} data-testid={`status-record-${record.id}`}>
            {statusConfig.text}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-1 justify-end">
            <MedicalRecordForm 
              recordToEdit={record}
              trigger={
                <Button 
                  size="sm" 
                  variant="outline" 
                  data-testid={`button-edit-record-${record.id}`}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Редактировать
                </Button>
              }
            />
            <PrintDocumentButton
              entityId={record.id}
              entityType="medical_record"
              variant="outline"
              size="sm"
              showLabel={true}
            />
          </div>
        </TableCell>
      </TableRow>
    </>
  )
}

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

  const { data: doctors = [] } = useQuery<any[]>({
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

  // Use enriched records from backend (no transformation needed)
  // Backend now returns doctorName, patientName, ownerName, visitTypeLabel, etc.
  const transformedRecords = useMemo(() => {
    return medicalRecords.map((record: any) => ({
      ...record,
      // Ensure medications and treatment are arrays
      medications: record.medications || [],
      treatment: Array.isArray(record.treatment) ? record.treatment : []
    }))
  }, [medicalRecords])

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
      ) : filteredRecords.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-muted-foreground">
              {searchTerm ? 'Медицинские записи не найдены' : 'Медицинские записи отсутствуют'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Пациент</TableHead>
                    <TableHead>Владелец</TableHead>
                    <TableHead>Врач</TableHead>
                    <TableHead>Тип визита</TableHead>
                    <TableHead>Диагноз</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record, index) => (
                    <MedicalRecordTableRow key={record.id || `record-${index}`} record={record} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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

      {/* AI Assistant for voice-activated medical record input */}
      <AIAssistantWidget role="doctor" />
    </div>
  )
}