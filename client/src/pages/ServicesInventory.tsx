import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Plus, Clock, Package, AlertTriangle } from "lucide-react"
import ServiceDialog from "@/components/ServiceDialog"
import ProductDialog from "@/components/ProductDialog"
import type { Service, Product } from "@shared/schema"

// Real API data fetching

export default function ServicesInventory() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("services")
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)
  const [productDialogOpen, setProductDialogOpen] = useState(false)

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
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setServiceDialogOpen(true)}
            data-testid="button-add-service"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить услугу
          </Button>
          <Button 
            onClick={() => setProductDialogOpen(true)}
            data-testid="button-add-product"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить товар
          </Button>
        </div>
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
                        {service.price.toLocaleString('ru-RU')} ₽
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
                    const isLowStock = product.stock !== undefined && product.minStock !== undefined && product.stock <= product.minStock;
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
                          {product.price.toLocaleString('ru-RU')} ₽
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

      {/* Dialogs */}
      <ServiceDialog 
        open={serviceDialogOpen} 
        onOpenChange={setServiceDialogOpen} 
      />
      <ProductDialog 
        open={productDialogOpen} 
        onOpenChange={setProductDialogOpen} 
      />
    </div>
  )
}