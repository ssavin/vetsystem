import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Clock, Package, AlertTriangle } from "lucide-react"

// TODO: Remove mock data when connecting to real backend
const mockServices = [
  {
    id: "1",
    name: "Общий клинический осмотр",
    category: "Диагностика",
    type: 'service' as const,
    price: 800,
    duration: 30,
    description: "Полный осмотр животного с проверкой всех систем организма",
    isActive: true
  },
  {
    id: "2",
    name: "Вакцинация против бешенства",
    category: "Профилактика",
    type: 'service' as const,
    price: 1500,
    duration: 30,
    description: "Комплексная вакцинация животного против бешенства с предварительным осмотром",
    isActive: true
  },
  {
    id: "3",
    name: "Хирургическая операция",
    category: "Хирургия",
    type: 'service' as const,
    price: 8500,
    duration: 120,
    description: "Плановая хирургическая операция под общей анестезией",
    isActive: true
  },
  {
    id: "4",
    name: "УЗИ диагностика",
    category: "Диагностика",
    type: 'service' as const,
    price: 2200,
    duration: 45,
    description: "Ультразвуковая диагностика органов брюшной полости",
    isActive: true
  }
]

const mockProducts = [
  {
    id: "5",
    name: "Корм Royal Canin для кошек",
    category: "Корма",
    type: 'product' as const,
    price: 850,
    stock: 3,
    minStock: 5,
    unit: "уп",
    description: "Сухой корм для взрослых кошек всех пород. Полнорационное питание с оптимальным балансом белков и жиров",
    isActive: true
  },
  {
    id: "6",
    name: "Витамины для собак",
    category: "Препараты",
    type: 'product' as const,
    price: 450,
    stock: 15,
    minStock: 10,
    unit: "шт",
    description: "Комплекс витаминов и минералов для поддержания здоровья собак",
    isActive: true
  },
  {
    id: "7",
    name: "Антибиотик широкого спектра",
    category: "Медикаменты",
    type: 'product' as const,
    price: 320,
    stock: 2,
    minStock: 8,
    unit: "фл",
    description: "Антибактериальный препарат для лечения инфекционных заболеваний",
    isActive: true
  },
  {
    id: "8",
    name: "Игрушка для кошек",
    category: "Аксессуары",
    type: 'product' as const,
    price: 180,
    stock: 25,
    minStock: 15,
    unit: "шт",
    description: "Интерактивная игрушка для активных игр и развлечения кошек",
    isActive: true
  }
]

export default function ServicesInventory() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("services")

  const filteredServices = mockServices.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )


  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-services-inventory-title">Цены на услуги и товары</h1>
          <p className="text-muted-foreground">Прейскурант ветеринарных услуг и товаров клиники</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-add-service">
            <Plus className="h-4 w-4 mr-2" />
            Добавить услугу
          </Button>
          <Button data-testid="button-add-product">
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
    </div>
  )
}