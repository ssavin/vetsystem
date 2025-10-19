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
import CreateCaseWithSearchDialog from "@/components/CreateCaseWithSearchDialog"
import type { MedicalRecord } from "@shared/schema"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PrintDocumentButton } from "@/components/PrintDocumentButton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [autoOpenTriggered, setAutoOpenTriggered] = useState(false)
  const pageSize = 50
  const { toast } = useToast()
  
  // Фильтры
  const [showFilters, setShowFilters] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedVisitType, setSelectedVisitType] = useState<string | null>(null)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })

  // Get patientId and autoOpen from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const patientId = params.get('patientId')
    const autoOpen = params.get('autoOpen') === 'true'
    
    if (patientId) {
      setSelectedPatientId(patientId)
      setPage(0) // Reset page when patient changes
      
      // Set flag to trigger auto-open after records load
      if (autoOpen && !autoOpenTriggered) {
        setAutoOpenTriggered(true)
      }
    }
  }, [])

  // Reset page when patient filter changes
  useEffect(() => {
    setPage(0)
  }, [selectedPatientId])

  // Fetch medical records with pagination
  const params = new URLSearchParams({
    limit: pageSize.toString(),
    offset: (page * pageSize).toString(),
    ...(selectedPatientId && { patientId: selectedPatientId })
  });
  
  const { data, isLoading, error } = useQuery<{
    records: MedicalRecord[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  }>({
    queryKey: [`/api/medical-records?${params}`],
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

  // Filter records based on all filters
  const filteredRecords = useMemo(() => {
    let records = transformedRecords

    // Filter by selected patient first
    if (selectedPatientId) {
      records = records.filter(record => record.patientId === selectedPatientId)
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      records = records.filter(record => 
        record.patientName?.toLowerCase().includes(searchLower) ||
        record.doctorName?.toLowerCase().includes(searchLower) ||
        record.diagnosis?.toLowerCase().includes(searchLower) ||
        record.visitType?.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (selectedStatus) {
      records = records.filter(record => record.status === selectedStatus)
    }

    // Apply visit type filter
    if (selectedVisitType) {
      records = records.filter(record => record.visitType === selectedVisitType)
    }

    // Apply doctor filter
    if (selectedDoctorId) {
      records = records.filter(record => record.doctorId === selectedDoctorId)
    }

    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      records = records.filter(record => {
        if (!record.visitDate) return false
        const recordDate = new Date(record.visitDate)
        
        if (dateRange.from && recordDate < dateRange.from) return false
        if (dateRange.to && recordDate > dateRange.to) return false
        
        return true
      })
    }

    return records
  }, [transformedRecords, searchTerm, selectedPatientId, selectedStatus, selectedVisitType, selectedDoctorId, dateRange])

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
    setShowFilters(true)
  }

  const handlePeriodClick = () => {
    setShowDatePicker(true)
  }
  
  const clearAllFilters = () => {
    setSelectedStatus(null)
    setSelectedVisitType(null)
    setSelectedDoctorId(null)
    setDateRange({ from: undefined, to: undefined })
  }
  
  const hasActiveFilters = selectedStatus || selectedVisitType || selectedDoctorId || dateRange.from || dateRange.to

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

  // Auto-open form when triggered from registry (regardless of existing records)
  useEffect(() => {
    if (autoOpenTriggered && !isLoading && selectedPatientId) {
      setIsCreateDialogOpen(true)
      setAutoOpenTriggered(false) // Reset flag after opening
      
      // Remove autoOpen from URL to avoid re-triggering on refresh/back navigation
      const url = new URL(window.location.href)
      url.searchParams.delete('autoOpen')
      window.history.replaceState({}, '', url.toString())
    }
  }, [autoOpenTriggered, isLoading, selectedPatientId])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-medical-records-title">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateCaseWithSearchDialog />
          <MedicalRecordForm 
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          />
        </div>
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

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Активные фильтры:</span>
          {selectedStatus && (
            <Badge variant="outline" className="gap-1">
              Статус: {selectedStatus === 'active' ? 'Активное' : selectedStatus === 'completed' ? 'Завершено' : 'Требует наблюдения'}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedStatus(null)} />
            </Badge>
          )}
          {selectedVisitType && (
            <Badge variant="outline" className="gap-1">
              Тип: {selectedVisitType}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedVisitType(null)} />
            </Badge>
          )}
          {selectedDoctorId && (
            <Badge variant="outline" className="gap-1">
              Врач: {doctors.find(d => d.id === selectedDoctorId)?.name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedDoctorId(null)} />
            </Badge>
          )}
          {(dateRange.from || dateRange.to) && (
            <Badge variant="outline" className="gap-1">
              Период: {dateRange.from ? format(dateRange.from, 'dd.MM.yyyy') : '...'} - {dateRange.to ? format(dateRange.to, 'dd.MM.yyyy') : '...'}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setDateRange({ from: undefined, to: undefined })} />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} data-testid="button-clear-all-filters">
            Очистить все
          </Button>
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

      {/* Filters Dialog */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Фильтры медицинских записей</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Статус</label>
              <Select value={selectedStatus || "all"} onValueChange={(val) => setSelectedStatus(val === 'all' ? null : val)}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="active">Активное лечение</SelectItem>
                  <SelectItem value="completed">Завершено</SelectItem>
                  <SelectItem value="follow_up_required">Требует наблюдения</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Тип визита</label>
              <Select value={selectedVisitType || "all"} onValueChange={(val) => setSelectedVisitType(val === 'all' ? null : val)}>
                <SelectTrigger data-testid="select-visittype-filter">
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="consultation">Консультация</SelectItem>
                  <SelectItem value="vaccination">Вакцинация</SelectItem>
                  <SelectItem value="surgery">Хирургия</SelectItem>
                  <SelectItem value="emergency">Экстренный прием</SelectItem>
                  <SelectItem value="follow_up">Повторный визит</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Врач</label>
              <Select value={selectedDoctorId || "all"} onValueChange={(val) => setSelectedDoctorId(val === 'all' ? null : val)}>
                <SelectTrigger data-testid="select-doctor-filter">
                  <SelectValue placeholder="Все врачи" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все врачи</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearAllFilters} data-testid="button-clear-filters">
              Очистить все
            </Button>
            <Button onClick={() => setShowFilters(false)} data-testid="button-apply-filters">
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Range Picker Dialog */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выбор периода</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Начальная дата</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-date-from">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, 'PPP', { locale: ru }) : 'Выберите дату'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Конечная дата</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-date-to">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, 'PPP', { locale: ru }) : 'Выберите дату'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateRange({ from: undefined, to: undefined })} data-testid="button-clear-dates">
              Очистить даты
            </Button>
            <Button onClick={() => setShowDatePicker(false)} data-testid="button-apply-dates">
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Assistant for voice-activated medical record input */}
      <AIAssistantWidget role="doctor" />
    </div>
  )
}