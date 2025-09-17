import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
    ;(patients as any[]).forEach((patient: any) => {
      map[patient.id] = patient
    })
    return map
  }, [patients])

  const doctorMap = useMemo(() => {
    const map: Record<string, any> = {}
    ;(doctors as any[]).forEach((doctor: any) => {
      map[doctor.id] = doctor
    })
    return map
  }, [doctors])

  const studyMap = useMemo(() => {
    const map: Record<string, any> = {}
    ;(labStudies as LabStudy[]).forEach((study: LabStudy) => {
      map[study.id] = study
    })
    return map
  }, [labStudies])

  // Filter data based on search term
  const filteredStudies = useMemo(() => {
    if (!searchTerm) return labStudies as LabStudy[]
    return (labStudies as LabStudy[]).filter((study: LabStudy) => 
      study.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      study.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [labStudies, searchTerm])

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return labOrders as LabOrder[]
    return (labOrders as LabOrder[]).filter((order: LabOrder) => {
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Лабораторные исследования</h3>
        <Button data-testid="button-add-study">
          <Plus className="h-4 w-4 mr-2" />
          Добавить исследование
        </Button>
      </div>
      {studiesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudies.map((study: LabStudy) => (
            <Card key={study.id} className="hover-elevate" data-testid={`card-study-${study.id}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Microscope className="h-4 w-4 mr-2 text-primary" />
                  {study.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {study.description && (
                  <p className="text-sm text-muted-foreground mb-3">{study.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <Badge variant={study.isActive ? "default" : "secondary"}>
                    {study.isActive ? "Активно" : "Неактивно"}
                  </Badge>
                  <Button variant="ghost" size="sm" data-testid={`button-view-study-${study.id}`}>
                    Подробнее
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const OrdersTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Заказы анализов</h3>
        <Button data-testid="button-add-order">
          <Plus className="h-4 w-4 mr-2" />
          Новый заказ
        </Button>
      </div>
      {ordersLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-3 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order: LabOrder) => {
            const patient = patientMap[order.patientId]
            const doctor = doctorMap[order.doctorId || '']
            const study = studyMap[order.studyId || '']
            
            return (
              <Card key={order.id} className="hover-elevate" data-testid={`card-order-${order.id}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold flex items-center">
                        <ClipboardList className="h-4 w-4 mr-2 text-primary" />
                        {study?.name || 'Исследование не найдено'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Заказ #{order.id.slice(-8)}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Пациент:</p>
                      <p className="font-medium flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {patient?.name || 'Не указан'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Врач:</p>
                      <p className="font-medium">{doctor?.name || 'Не указан'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Дата заказа:</p>
                      <p className="font-medium flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(order.orderedDate).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 space-x-2">
                    <Button variant="outline" size="sm" data-testid={`button-edit-order-${order.id}`}>
                      Редактировать
                    </Button>
                    <Button variant="default" size="sm" data-testid={`button-view-results-${order.id}`}>
                      Результаты
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  const ResultsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Результаты анализов</h3>
        <Button data-testid="button-add-result">
          <Plus className="h-4 w-4 mr-2" />
          Добавить результат
        </Button>
      </div>
      {resultsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(labResults as LabResultDetail[]).map((result: LabResultDetail) => (
            <Card key={result.id} className="hover-elevate" data-testid={`card-result-${result.id}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-primary" />
                      Результат анализа
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      ID: {result.id.slice(-8)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={result.flags?.includes('abnormal') ? "destructive" : "default"}>
                      {result.flags || 'normal'}
                    </Badge>
                    {result.flags?.includes('abnormal') && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Значение:</p>
                    <p className="font-medium text-lg">
                      {result.value || result.numericValue || 'Не указано'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Статус:</p>
                    <p className="font-medium">{result.status || 'Не указан'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Дата создания:</p>
                    <p className="font-medium flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {result.createdAt 
                        ? new Date(result.createdAt).toLocaleDateString('ru-RU') 
                        : 'Не указана'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Отчет:</p>
                    <p className="font-medium">
                      {result.reportedDate 
                        ? new Date(result.reportedDate).toLocaleDateString('ru-RU') 
                        : 'Не отчитан'}
                    </p>
                  </div>
                </div>
                {result.notes && (
                  <div className="mt-3 p-2 bg-muted rounded">
                    <p className="text-sm">{result.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
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