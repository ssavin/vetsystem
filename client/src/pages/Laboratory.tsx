import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Search, 
  Plus, 
  Filter, 
  Microscope, 
  FileText, 
  ClipboardList,
  Calendar,
  User,
  AlertCircle
} from "lucide-react"
import LabStudyDialog from "@/components/LabStudyDialog"
import LabOrderDialog from "@/components/LabOrderDialog"
import LabResultDialog from "@/components/LabResultDialog"
import LabParameterDialog from "@/components/LabParameterDialog"
import type { 
  LabStudy, 
  LabOrder, 
  LabResultDetail,
  LabParameter,
  ReferenceRange 
} from "@shared/schema"

export default function Laboratory() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("studies")

  // Fetch laboratory data
  const { data: labStudies = [], isLoading: studiesLoading } = useQuery({
    queryKey: ['/api/lab-studies'],
  })

  const { data: labOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/lab-orders'],
  })

  const { data: labResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['/api/lab-result-details'],
  })

  const { data: labParameters = [], isLoading: parametersLoading } = useQuery({
    queryKey: ['/api/lab-parameters'],
  })

  // Fetch supporting data
  const { data: patients = [] } = useQuery({
    queryKey: ['/api/patients'],
  })

  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
  })

  // Create lookup maps
  const patientMap = useMemo(() => {
    const map: Record<string, any> = {}
    if (Array.isArray(patients)) {
      patients.forEach((patient: any) => {
        map[patient.id] = patient
      })
    }
    return map
  }, [patients])

  const doctorMap = useMemo(() => {
    const map: Record<string, any> = {}
    if (Array.isArray(doctors)) {
      doctors.forEach((doctor: any) => {
        map[doctor.id] = doctor
      })
    }
    return map
  }, [doctors])

  const studyMap = useMemo(() => {
    const map: Record<string, any> = {}
    if (Array.isArray(labStudies)) {
      labStudies.forEach((study: LabStudy) => {
        map[study.id] = study
      })
    }
    return map
  }, [labStudies])

  // Filter data based on search term
  const filteredStudies = useMemo(() => {
    if (!Array.isArray(labStudies)) return []
    if (!searchTerm) return labStudies as LabStudy[]
    return labStudies.filter((study: LabStudy) => 
      study.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      study.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [labStudies, searchTerm])

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(labOrders)) return []
    if (!searchTerm) return labOrders as LabOrder[]
    return labOrders.filter((order: LabOrder) => {
      const patient = patientMap[order.patientId]
      const doctor = doctorMap[order.doctorId]
      return (
        patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.status?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  }, [labOrders, searchTerm, patientMap, doctorMap])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary'
      case 'in_progress': return 'default'
      case 'completed': return 'default'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает'
      case 'in_progress': return 'В процессе'
      case 'completed': return 'Завершен'
      case 'cancelled': return 'Отменен'
      default: return status
    }
  }

  const StudiesTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Лабораторные исследования</h3>
      {studiesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex space-x-4 p-4">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Исследование</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudies.map((study: LabStudy) => (
              <TableRow key={study.id} data-testid={`row-study-${study.id}`}>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <Microscope className="h-4 w-4 mr-2 text-primary" />
                    {study.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {study.description || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={study.isActive ? "default" : "secondary"}>
                    {study.isActive ? "Активно" : "Неактивно"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <LabParameterDialog studyId={study.id}>
                      <Button variant="outline" size="sm" data-testid={`button-parameters-${study.id}`}>
                        Параметры
                      </Button>
                    </LabParameterDialog>
                    <Button variant="ghost" size="sm" data-testid={`button-view-study-${study.id}`}>
                      Подробнее
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )

  const OrdersTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Заказы анализов</h3>
      {ordersLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex space-x-4 p-4">
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/8" />
              <Skeleton className="h-4 w-1/8" />
            </div>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Заказ</TableHead>
              <TableHead>Исследование</TableHead>
              <TableHead>Пациент</TableHead>
              <TableHead>Врач</TableHead>
              <TableHead>Дата заказа</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order: LabOrder) => {
              const patient = patientMap[order.patientId]
              const doctor = doctorMap[order.doctorId || '']
              const study = studyMap[order.studyId || '']
              
              return (
                <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <ClipboardList className="h-4 w-4 mr-2 text-primary" />
                      #{order.id.slice(-8)}
                    </div>
                  </TableCell>
                  <TableCell>{study?.name || 'Исследование не найдено'}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {patient?.name || 'Не указан'}
                    </div>
                  </TableCell>
                  <TableCell>{doctor?.name || 'Не указан'}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(order.orderedDate).toLocaleDateString('ru-RU')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.status || 'pending')}>
                      {getStatusText(order.status || 'pending')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button variant="outline" size="sm" data-testid={`button-edit-order-${order.id}`}>
                        Редактировать
                      </Button>
                      <Button variant="default" size="sm" data-testid={`button-view-results-${order.id}`}>
                        Результаты
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )

  const ResultsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Результаты анализов</h3>
      {resultsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex space-x-4 p-4">
              <Skeleton className="h-4 w-1/8" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/8" />
              <Skeleton className="h-4 w-1/8" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/6" />
            </div>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Значение</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Флаги</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead>Дата отчета</TableHead>
              <TableHead>Примечания</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(labResults as LabResultDetail[]).map((result: LabResultDetail) => (
              <TableRow key={result.id} data-testid={`row-result-${result.id}`}>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    {result.id.slice(-8)}
                  </div>
                </TableCell>
                <TableCell className="font-medium text-lg">
                  {result.value || result.numericValue || 'Не указано'}
                </TableCell>
                <TableCell>{result.status || 'Не указан'}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Badge variant={result.flags?.includes('abnormal') ? "destructive" : "default"}>
                      {result.flags || 'normal'}
                    </Badge>
                    {result.flags?.includes('abnormal') && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {result.createdAt 
                      ? new Date(result.createdAt).toLocaleDateString('ru-RU') 
                      : 'Не указана'}
                  </div>
                </TableCell>
                <TableCell>
                  {result.reportedDate 
                    ? new Date(result.reportedDate).toLocaleDateString('ru-RU') 
                    : 'Не отчитан'}
                </TableCell>
                <TableCell className="max-w-xs">
                  {result.notes ? (
                    <div className="truncate" title={result.notes}>
                      {result.notes}
                    </div>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Microscope className="h-8 w-8 mr-3 text-primary" />
            Лабораторный модуль
          </h1>
          <p className="text-muted-foreground mt-1">
            Управление лабораторными исследованиями, заказами и результатами
          </p>
        </div>
        <div className="flex space-x-2">
          <LabStudyDialog>
            <Button data-testid="button-add-study">
              <Plus className="h-4 w-4 mr-2" />
              Добавить исследование
            </Button>
          </LabStudyDialog>
          <LabOrderDialog>
            <Button data-testid="button-new-order">
              <Plus className="h-4 w-4 mr-2" />
              Новый заказ
            </Button>
          </LabOrderDialog>
          <LabResultDialog>
            <Button data-testid="button-add-result">
              <Plus className="h-4 w-4 mr-2" />
              Добавить результат
            </Button>
          </LabResultDialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по исследованиям, пациентам, врачам..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="input-search"
              />
            </div>
            <Button variant="outline" size="icon" data-testid="button-search">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" data-testid="button-filter">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="studies" data-testid="tab-studies">
            <Microscope className="h-4 w-4 mr-2" />
            Исследования
          </TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">
            <ClipboardList className="h-4 w-4 mr-2" />
            Заказы
          </TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">
            <FileText className="h-4 w-4 mr-2" />
            Результаты
          </TabsTrigger>
        </TabsList>

        <TabsContent value="studies" className="space-y-4">
          <StudiesTab />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <OrdersTab />
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <ResultsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}