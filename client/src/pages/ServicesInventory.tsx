import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus } from "lucide-react"
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