import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, RefreshCw, Clock, Package, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"
import type { Service, Product, SystemSetting, IntegrationCredentials } from "@shared/schema"

// Real API data fetching

export default function ServicesInventory() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("services")
  const [showSyncConfirmDialog, setShowSyncConfirmDialog] = useState(false)
  const [servicesPage, setServicesPage] = useState(1)
  const [productsPage, setProductsPage] = useState(1)
  const itemsPerPage = 50
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch real services data
  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Fetch real products data
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Fetch system settings to determine fiscal receipt system
  const { data: systemSettings = [], isLoading: isLoadingSettings } = useQuery<SystemSetting[]>({
    queryKey: ['/api/system-settings'],
  })

  const fiscalReceiptSystem = systemSettings.find(s => s.key === 'fiscal_receipt_system')?.value

  // Fetch integration credentials to check if they are configured
  const { data: moyskladCreds } = useQuery<IntegrationCredentials>({
    queryKey: ['/api/integration-credentials/moysklad'],
    enabled: fiscalReceiptSystem === 'moysklad',
  })

  const { data: dreamkasCreds } = useQuery<IntegrationCredentials>({
    queryKey: ['/api/integration-credentials/dreamkas'],
    enabled: fiscalReceiptSystem === 'dreamkas',
  })

  const { data: onecCreds } = useQuery<IntegrationCredentials>({
    queryKey: ['/api/integration-credentials/onec'],
    enabled: fiscalReceiptSystem === 'onec',
  })

  // Nomenclature sync mutation
  const syncNomenclatureMutation = useMutation({
    mutationFn: async () => {
      if (fiscalReceiptSystem === 'onec') {
        // Синхронизация с 1С Розница
        await apiRequest('POST', '/api/onec/products/sync')
        await apiRequest('POST', '/api/onec/services/sync')
      } else if (fiscalReceiptSystem === 'moysklad') {
        // Синхронизация с МойСклад
        await apiRequest('POST', '/api/moysklad/nomenclature/sync')
      } else if (fiscalReceiptSystem === 'dreamkas') {
        // Синхронизация с Дримкас
        const response = await apiRequest('POST', '/api/dreamkas/sync/nomenclature')
        return await response.json()
      } else {
        throw new Error('Не выбрана система для синхронизации номенклатуры')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] })
      queryClient.invalidateQueries({ queryKey: ['/api/products'] })
      
      let systemName = 'МойСклад'
      if (fiscalReceiptSystem === 'onec') systemName = '1С Розница'
      else if (fiscalReceiptSystem === 'dreamkas') systemName = 'Дримкас'
      
      toast({
        title: "Синхронизация завершена",
        description: `Номенклатура успешно загружена из ${systemName}`,
      })
    },
    onError: (error: any) => {
      let errorMessage = "Не удалось загрузить номенклатуру"
      
      // Преобразуем технические ошибки в понятные сообщения на русском
      if (error.message?.includes('integration not configured')) {
        errorMessage = `Интеграция с ${getSystemDisplayName()} не настроена или неактивна`
      } else if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        errorMessage = `Ошибка авторизации в ${getSystemDisplayName()}. Проверьте настройки интеграции`
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: "Ошибка синхронизации",
        description: errorMessage,
        variant: "destructive",
      })
    }
  })

  const handleSyncNomenclature = () => {
    setShowSyncConfirmDialog(true)
  }

  const confirmSync = () => {
    setShowSyncConfirmDialog(false)
    syncNomenclatureMutation.mutate()
  }

  // Determine display name for fiscal system
  const getSystemDisplayName = () => {
    if (fiscalReceiptSystem === 'onec') return '1С Розница'
    if (fiscalReceiptSystem === 'moysklad') return 'МойСклад'
    if (fiscalReceiptSystem === 'dreamkas') return 'Дримкас'
    return 'не выбрана'
  }

  // Check if sync is available - system must be selected AND integration must be configured
  const isSyncAvailable = !isLoadingSettings && (
    (fiscalReceiptSystem === 'moysklad' && moyskladCreds?.isEnabled) ||
    (fiscalReceiptSystem === 'dreamkas' && dreamkasCreds?.isEnabled) ||
    (fiscalReceiptSystem === 'onec' && onecCreds?.isEnabled)
  )

  // Get warning message if sync is not available
  const getSyncWarningMessage = () => {
    if (isLoadingSettings) return null
    if (!fiscalReceiptSystem || fiscalReceiptSystem === 'yookassa') {
      return 'Для синхронизации номенклатуры выберите систему фискальных чеков (МойСклад, Дримкас или 1С Розница) в настройках'
    }
    if (fiscalReceiptSystem === 'moysklad' && !moyskladCreds?.isEnabled) {
      return 'Интеграция с МойСклад не настроена или неактивна. Настройте её в разделе Интеграции'
    }
    if (fiscalReceiptSystem === 'dreamkas' && !dreamkasCreds?.isEnabled) {
      return 'Интеграция с Дримкас не настроена или неактивна. Настройте её в разделе Интеграции'
    }
    if (fiscalReceiptSystem === 'onec' && !onecCreds?.isEnabled) {
      return 'Интеграция с 1С Розница не настроена или неактивна. Настройте её в разделе Интеграции'
    }
    return null
  }

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination logic
  const totalServicesPages = Math.ceil(filteredServices.length / itemsPerPage)
  const totalProductsPages = Math.ceil(filteredProducts.length / itemsPerPage)
  
  const paginatedServices = filteredServices.slice(
    (servicesPage - 1) * itemsPerPage,
    servicesPage * itemsPerPage
  )
  
  const paginatedProducts = filteredProducts.slice(
    (productsPage - 1) * itemsPerPage,
    productsPage * itemsPerPage
  )

  // Reset to page 1 when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setServicesPage(1)
    setProductsPage(1)
  }

  if (servicesLoading || productsLoading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>
  }


  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-services-inventory-title">Цены на услуги и товары</h1>
          <p className="text-muted-foreground">Прейскурант ветеринарных услуг и товаров клиники</p>
          {getSyncWarningMessage() && (
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
              {getSyncWarningMessage()}
            </p>
          )}
        </div>
        <Button 
          onClick={handleSyncNomenclature}
          disabled={!isSyncAvailable || syncNomenclatureMutation.isPending}
          data-testid="button-sync-nomenclature"
        >
          {syncNomenclatureMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : isLoadingSettings ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {isLoadingSettings ? 'Загрузка...' : 'Загрузить номенклатуру'}
        </Button>
      </div>

      {/* Services and Products Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Sticky Search and Tabs Section */}
        <div className="sticky top-0 z-10 bg-background pb-4">
          {/* Search and Tabs in one row */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или категории..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                data-testid="input-search-services"
              />
            </div>
            <TabsList>
              <TabsTrigger value="services" data-testid="tab-services">
                Услуги ({filteredServices.length})
              </TabsTrigger>
              <TabsTrigger value="products" data-testid="tab-products">
                Товары ({filteredProducts.length})
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="services" className="mt-0 space-y-4">
          <Card>
            <div className="overflow-auto max-h-[calc(100vh-280px)]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Длительность</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Услуги не найдены' : 'Услуги отсутствуют'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedServices.map(service => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <Clock className="h-4 w-4 text-blue-500" />
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-service-name-${service.id}`}>
                        {service.name}
                        {service.description && service.description !== service.name && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-service-price-${service.id}`}>
                        {Number(service.price).toLocaleString('ru-RU')} ₽
                      </TableCell>
                      <TableCell>
                        {service.duration ? (
                          <Badge variant="secondary">{service.duration} мин</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </Card>

          {/* Services Pagination */}
          {totalServicesPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Показано {((servicesPage - 1) * itemsPerPage) + 1} - {Math.min(servicesPage * itemsPerPage, filteredServices.length)} из {filteredServices.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setServicesPage(p => Math.max(1, p - 1))}
                  disabled={servicesPage === 1}
                  data-testid="button-services-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </Button>
                <span className="text-sm">
                  Страница {servicesPage} из {totalServicesPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setServicesPage(p => Math.min(totalServicesPages, p + 1))}
                  disabled={servicesPage === totalServicesPages}
                  data-testid="button-services-next-page"
                >
                  Вперед
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-0 space-y-4">
          <Card>
            <div className="overflow-auto max-h-[calc(100vh-280px)]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Единица</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Товары не найдены' : 'Товары отсутствуют'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Package className="h-4 w-4 text-green-500" />
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-product-name-${product.id}`}>
                        {product.name}
                        {product.description && product.description !== product.name && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {product.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-product-price-${product.id}`}>
                        {Number(product.price).toLocaleString('ru-RU')} ₽
                      </TableCell>
                      <TableCell>{product.unit || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </Card>

          {/* Products Pagination */}
          {totalProductsPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Показано {((productsPage - 1) * itemsPerPage) + 1} - {Math.min(productsPage * itemsPerPage, filteredProducts.length)} из {filteredProducts.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                  disabled={productsPage === 1}
                  data-testid="button-products-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </Button>
                <span className="text-sm">
                  Страница {productsPage} из {totalProductsPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProductsPage(p => Math.min(totalProductsPages, p + 1))}
                  disabled={productsPage === totalProductsPages}
                  data-testid="button-products-next-page"
                >
                  Вперед
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sync Confirmation Dialog */}
      <AlertDialog open={showSyncConfirmDialog} onOpenChange={setShowSyncConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Загрузка номенклатуры</AlertDialogTitle>
            <AlertDialogDescription>
              Внимание! Вся текущая номенклатура (товары и услуги) будет удалена и заменена данными из системы{' '}
              <strong>{getSystemDisplayName()}</strong>.
              <br /><br />
              Эта операция необратима. Продолжить?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              data-testid="button-cancel-sync"
              disabled={syncNomenclatureMutation.isPending}
            >
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSync}
              disabled={syncNomenclatureMutation.isPending}
              data-testid="button-confirm-sync"
            >
              {syncNomenclatureMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                'Загрузить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}