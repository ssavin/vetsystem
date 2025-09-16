import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Package, Clock, AlertTriangle } from "lucide-react"
import ServiceItem from "@/components/ServiceItem"

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

  const lowStockProducts = mockProducts.filter(p => 
    p.stock !== undefined && p.minStock !== undefined && p.stock <= p.minStock
  )

  const totalProducts = mockProducts.reduce((sum, p) => sum + (p.stock || 0), 0)
  const totalServices = mockServices.length

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-services-inventory-title">Услуги и склад</h1>
          <p className="text-muted-foreground">Управление услугами клиники и складскими запасами</p>
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-services">
                  {totalServices}
                </p>
                <p className="text-xs text-muted-foreground">Всего услуг</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-products">
                  {totalProducts}
                </p>
                <p className="text-xs text-muted-foreground">Товаров на складе</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600" data-testid="text-low-stock">
                  {lowStockProducts.length}
                </p>
                <p className="text-xs text-muted-foreground">Мало товара</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-2xl font-bold" data-testid="text-categories">
                {Array.from(new Set([...mockServices, ...mockProducts].map(item => item.category))).length}
              </p>
              <p className="text-xs text-muted-foreground">Категорий</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              Товары с низким остатком
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map(product => (
                <Badge key={product.id} variant="destructive" className="text-xs">
                  {product.name}: {product.stock} {product.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredServices.map(service => (
              <ServiceItem key={service.id} service={service} />
            ))}
          </div>
          {filteredServices.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Услуги не найдены' : 'Услуги отсутствуют'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <ServiceItem key={product.id} service={product} />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Товары не найдены' : 'Товары отсутствуют'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}