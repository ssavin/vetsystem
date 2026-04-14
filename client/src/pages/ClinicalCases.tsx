import { useState, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Clock, CheckCircle2, XCircle, Info, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
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
import CreateCaseWithSearchDialog from "@/components/CreateCaseWithSearchDialog"
import { translateSpecies } from "@/lib/utils"

const PAGE_SIZE = 50

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
  patientName?: string
  species?: string
  breed?: string
  ownerName?: string
  ownerPhone?: string
}

interface ClinicalCasesResponse {
  cases: ClinicalCase[]
  total: number
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function ClinicalCases() {
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [, navigate] = useLocation()
  const { toast } = useToast()

  const debouncedSearch = useDebounce(searchInput, 400)

  // Reset to first page when filters change
  useEffect(() => { setPage(0) }, [debouncedSearch, statusFilter])

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    return `/api/clinical-cases?${params.toString()}`
  }, [debouncedSearch, statusFilter, page])

  const { data, isLoading, isFetching, error, refetch } = useQuery<ClinicalCasesResponse>({
    queryKey: ['/api/clinical-cases', debouncedSearch, statusFilter, page],
    queryFn: () => fetch(buildUrl(), { credentials: 'include' }).then(r => r.json()),
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (error) {
      toast({
        title: "Ошибка загрузки данных",
        description: error instanceof Error ? error.message : 'Ошибка загрузки данных',
        variant: "destructive",
      })
    }
  }, [error, toast])

  const cases = data?.cases ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-blue-500 shrink-0"><Clock className="h-3 w-3 mr-1" />Открыт</Badge>
      case 'closed':
        return <Badge variant="secondary" className="shrink-0"><XCircle className="h-3 w-3 mr-1" />Закрыт</Badge>
      case 'resolved':
        return <Badge variant="default" className="bg-green-500 shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Решен</Badge>
      default:
        return <Badge variant="outline" className="shrink-0">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-clinical-cases-title">Клинические случаи</h1>
          <p className="text-muted-foreground">Ведение и отслеживание клинических случаев пациентов</p>
        </div>
        <CreateCaseWithSearchDialog />
      </div>

      {/* Info card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg shrink-0">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Как создать клинический случай?
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Перейдите в <strong>Регистратуру</strong> и нажмите на иконку <FileText className="h-3 w-3 inline mx-1" /> рядом с нужным пациентом.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/registry')}
                className="bg-white dark:bg-gray-900"
                data-testid="button-go-to-registry"
              >
                Перейти в регистратуру
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск и фильтрация</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по пациенту, владельцу или причине визита..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
                data-testid="input-search-cases"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
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

      {/* Summary bar */}
      {!isLoading && (
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>
            {isFetching ? "Обновление..." : `Найдено: ${total.toLocaleString('ru-RU')}`}
          </span>
          {totalPages > 1 && (
            <span>Страница {page + 1} из {totalPages}</span>
          )}
        </div>
      )}

      {/* Cases List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-destructive mb-4">Ошибка загрузки данных</p>
            <Button onClick={() => refetch()} variant="outline" disabled={isFetching} data-testid="button-retry-load">
              {isFetching ? "Загрузка..." : "Повторить"}
            </Button>
          </CardContent>
        </Card>
      ) : cases.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              {debouncedSearch || statusFilter !== 'all'
                ? 'По вашему запросу ничего не найдено'
                : 'Клинические случаи отсутствуют'}
            </p>
            {!debouncedSearch && statusFilter === 'all' && (
              <Button variant="outline" onClick={() => navigate('/registry')} className="mt-2" data-testid="button-create-first-case">
                Перейти в регистратуру
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {cases.map((clinicalCase) => (
              <Card
                key={clinicalCase.id}
                className="hover-elevate cursor-pointer"
                onClick={() => navigate(`/clinical-cases/${clinicalCase.id}`)}
                data-testid={`card-case-${clinicalCase.id}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate" data-testid={`text-case-patient-${clinicalCase.id}`}>
                          {clinicalCase.patientName || '—'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {clinicalCase.species ? translateSpecies(clinicalCase.species) : ''}
                          {clinicalCase.breed ? ` • ${clinicalCase.breed}` : ''}
                        </p>
                        <p className="text-sm mt-1">
                          <span className="font-medium">Владелец:</span> {clinicalCase.ownerName || '—'}
                          {clinicalCase.ownerPhone && <span className="text-muted-foreground ml-2">• {clinicalCase.ownerPhone}</span>}
                        </p>
                        {clinicalCase.reasonForVisit && (
                          <p className="text-sm text-muted-foreground truncate">
                            <span className="font-medium text-foreground">Причина:</span> {clinicalCase.reasonForVisit}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {clinicalCase.startDate
                            ? format(new Date(clinicalCase.startDate), 'dd MMM yyyy', { locale: ru })
                            : '—'}
                          {clinicalCase.closeDate && (
                            <span className="ml-3">→ {format(new Date(clinicalCase.closeDate), 'dd MMM yyyy', { locale: ru })}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">{getStatusBadge(clinicalCase.status)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || isFetching}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
