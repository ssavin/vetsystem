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
import { Search, RefreshCw, Clock, Package, AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"
import type { Service, Product, SystemSetting } from "@shared/schema"

// Real API data fetching

export default function ServicesInventory() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("services")
  const [showSyncConfirmDialog, setShowSyncConfirmDialog] = useState(false)
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
      } else {
        throw new Error('Не выбрана система для синхронизации номенклатуры')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] })
      queryClient.invalidateQueries({ queryKey: ['/api/products'] })
      toast({
        title: "Синхронизация завершена",
        description: `Номенклатура успешно загружена из ${fiscalReceiptSystem === 'onec' ? '1С Розница' : 'МойСклад'}`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка синхронизации",
        description: error.message || "Не удалось загрузить номенклатуру",
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
    return 'не выбрана'
  }

  // Check if sync is available
  const isSyncAvailable = !isLoadingSettings && (fiscalReceiptSystem === 'moysklad' || fiscalReceiptSystem === 'onec')

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (servicesLoading || productsLoading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>
  }


  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-services-inventory-title">Цены на услуги и товары</h1>
          <p className="text-muted-foreground">Прейскурант ветеринарных услуг и товаров клиники</p>
          {!isLoadingSettings && !isSyncAvailable && (
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
              Для синхронизации номенклатуры настройте систему фискальных чеков (МойСклад или 1С Розница) в настройках
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

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск услуг и товаров</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или категории..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-services"
            />
          </div>
        </CardContent>
      </Card>

      {/* Services and Products Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="services" data-testid="tab-services">
            Услуги ({filteredServices.length})
          </TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">
            Товары ({filteredProducts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Длительность</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Услуги не найдены' : 'Услуги отсутствуют'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map(service => (
                    <TableRow key={service.id} className={!service.isActive ? 'opacity-50' : ''}>
                      <TableCell>
                        <Clock className="h-4 w-4 text-blue-500" />
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-service-name-${service.id}`}>
                        {service.name}
                        {service.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{service.category}</TableCell>
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
                      <TableCell>
                        {service.isActive ? (
                          <Badge variant="default">Активно</Badge>
                        ) : (
                          <Badge variant="destructive">Неактивно</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Остаток</TableHead>
                  <TableHead>Единица</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Товары не найдены' : 'Товары отсутствуют'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map(product => {
                    const isLowStock = product.stock !== null && product.stock !== undefined && 
                                       product.minStock !== null && product.minStock !== undefined && 
                                       product.stock <= product.minStock;
                    return (
                      <TableRow key={product.id} className={!product.isActive ? 'opacity-50' : ''}>
                        <TableCell>
                          <Package className="h-4 w-4 text-green-500" />
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-product-name-${product.id}`}>
                          {product.name}
                          {product.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {product.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell data-testid={`text-product-price-${product.id}`}>
                          {Number(product.price).toLocaleString('ru-RU')} ₽
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={isLowStock ? 'text-red-600 font-medium' : ''}>
                              {product.stock || 0}
                            </span>
                            {isLowStock && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Мало
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{product.unit || '-'}</TableCell>
                        <TableCell>
                          {product.isActive ? (
                            <Badge variant="default">Активно</Badge>
                          ) : (
                            <Badge variant="destructive">Неактивно</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
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