import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Filter, Calendar, FileText, Clock, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ClinicalCase {
  id: string
  patientId: string
  reasonForVisit: string
  status: 'open' | 'closed' | 'resolved'
  startDate: string
  closeDate?: string | null
  createdByUserId: string
  tenantId: string
  branchId: string
}

interface Patient {
  id: string
  name: string
  species: string
  breed?: string
  ownerId: string
}

interface Owner {
  id: string
  name: string
  phone?: string
}

export default function ClinicalCases() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [, navigate] = useLocation()
  const { toast } = useToast()

  // Fetch clinical cases
  const { 
    data: clinicalCases = [], 
    isLoading, 
    isFetching, 
    error, 
    refetch: refetchCases 
  } = useQuery<ClinicalCase[]>({
    queryKey: ['/api/clinical-cases'],
  })

  // Fetch patients for display names
  const { 
    data: patients = [], 
    isLoading: isLoadingPatients,
    isFetching: isFetchingPatients,
    error: patientsError, 
    refetch: refetchPatients 
  } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  })

  // Fetch owners
  const { 
    data: owners = [], 
    isLoading: isLoadingOwners,
    isFetching: isFetchingOwners,
    error: ownersError, 
    refetch: refetchOwners 
  } = useQuery<Owner[]>({
    queryKey: ['/api/owners'],
  })

  const isLoadingAny = isLoading || isLoadingPatients || isLoadingOwners
  const isFetchingAny = isFetching || isFetchingPatients || isFetchingOwners

  // Show error toast if any query fails
  useEffect(() => {
    if (error || patientsError || ownersError) {
      const errorMessage = 
        (error instanceof Error ? error.message : '') ||
        (patientsError instanceof Error ? patientsError.message : '') ||
        (ownersError instanceof Error ? ownersError.message : '') ||
        'Ошибка загрузки данных'
      
      toast({
        title: "Ошибка загрузки данных",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }, [error, patientsError, ownersError, toast])

  // Create lookup maps
  const patientMap = useMemo(() => {
    const map: Record<string, Patient> = {}
    patients.forEach((patient) => {
      map[patient.id] = patient
    })
    return map
  }, [patients])

  const ownerMap = useMemo(() => {
    const map: Record<string, Owner> = {}
    owners.forEach((owner) => {
      map[owner.id] = owner
    })
    return map
  }, [owners])

  // Transform cases with patient and owner data
  const transformedCases = useMemo(() => {
    return clinicalCases.map((clinicalCase) => {
      const patient = patientMap[clinicalCase.patientId]
      const owner = patient ? ownerMap[patient.ownerId] : null
      
      return {
        ...clinicalCase,
        patientName: patient ? patient.name : 'Неизвестный пациент',
        species: patient ? patient.species : '',
        breed: patient ? patient.breed : '',
        ownerName: owner ? owner.name : 'Неизвестный владелец',
        ownerPhone: owner ? owner.phone : '',
      }
    })
  }, [clinicalCases, patientMap, ownerMap])

  // Filter cases
  const filteredCases = useMemo(() => {
    let cases = transformedCases

    // Filter by status
    if (statusFilter !== 'all') {
      cases = cases.filter(c => c.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      cases = cases.filter(c => 
        c.patientName?.toLowerCase().includes(searchLower) ||
        c.ownerName?.toLowerCase().includes(searchLower) ||
        c.reasonForVisit?.toLowerCase().includes(searchLower)
      )
    }

    return cases
  }, [transformedCases, searchTerm, statusFilter])

  // Statistics
  const stats = useMemo(() => {
    return {
      total: clinicalCases.length,
      open: clinicalCases.filter(c => c.status === 'open').length,
      closed: clinicalCases.filter(c => c.status === 'closed').length,
      resolved: clinicalCases.filter(c => c.status === 'resolved').length,
    }
  }, [clinicalCases])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Открыт</Badge>
      case 'closed':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Закрыт</Badge>
      case 'resolved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Решен</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleCaseClick = (caseId: string) => {
    navigate(`/clinical-cases/${caseId}`)
  }

  const handleCreateCase = () => {
    toast({
      title: "Создание клинического случая",
      description: "Пожалуйста, выберите пациента для создания нового случая",
    })
    navigate('/registry')
  }

  const handleRetry = () => {
    refetchCases()
    refetchPatients()
    refetchOwners()
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-clinical-cases-title">Клинические случаи</h1>
          <p className="text-muted-foreground">Ведение и отслеживание клинических случаев пациентов</p>
        </div>
        <Button onClick={handleCreateCase} data-testid="button-create-case">
          <Plus className="h-4 w-4 mr-2" />
          Новый случай
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-8 mx-auto" />
              ) : (
                <p className="text-2xl font-bold text-primary" data-testid="text-total-cases">
                  {stats.total}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Всего случаев</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-8 mx-auto" />
              ) : (
                <p className="text-2xl font-bold text-blue-600" data-testid="text-open-cases">
                  {stats.open}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Открытых</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-8 mx-auto" />
              ) : (
                <p className="text-2xl font-bold text-gray-600" data-testid="text-closed-cases">
                  {stats.closed}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Закрытых</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-8 mx-auto" />
              ) : (
                <p className="text-2xl font-bold text-green-600" data-testid="text-resolved-cases">
                  {stats.resolved}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Решенных</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск и фильтрация</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по пациенту, владельцу или причине визита..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-cases"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="open">Открытые</SelectItem>
                <SelectItem value="closed">Закрытые</SelectItem>
                <SelectItem value="resolved">Решенные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      {isLoadingAny ? (
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
      ) : (error || patientsError || ownersError) ? (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-destructive mb-4">
              Ошибка загрузки данных
            </p>
            <Button 
              onClick={handleRetry} 
              variant="outline"
              disabled={isFetchingAny}
              data-testid="button-retry-load"
            >
              {isFetchingAny ? "Загрузка..." : "Повторить попытку"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {filteredCases.map((clinicalCase) => (
              <Card 
                key={clinicalCase.id} 
                className="hover-elevate cursor-pointer"
                onClick={() => handleCaseClick(clinicalCase.id)}
                data-testid={`card-case-${clinicalCase.id}`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold text-lg" data-testid={`text-case-patient-${clinicalCase.id}`}>
                            {clinicalCase.patientName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {clinicalCase.species} {clinicalCase.breed && `• ${clinicalCase.breed}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="ml-8 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Владелец:</span> {clinicalCase.ownerName}
                          {clinicalCase.ownerPhone && <span className="text-muted-foreground ml-2">• {clinicalCase.ownerPhone}</span>}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Причина визита:</span> {clinicalCase.reasonForVisit}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Открыт: {format(new Date(clinicalCase.startDate), 'dd MMM yyyy', { locale: ru })}
                          {clinicalCase.closeDate && (
                            <span className="ml-3">
                              Закрыт: {format(new Date(clinicalCase.closeDate), 'dd MMM yyyy', { locale: ru })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      {getStatusBadge(clinicalCase.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCases.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Клинические случаи не найдены' 
                    : 'Клинические случаи отсутствуют'}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleCreateCase}
                  data-testid="button-create-first-case"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Создать первый случай
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
