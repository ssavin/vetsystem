import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Banknote, TrendingUp, AlertCircle, FileText } from "lucide-react"
import InvoiceCard from "@/components/InvoiceCard"

// TODO: Remove mock data when connecting to real backend
const mockInvoices = [
  {
    id: "INV-2024-001",
    date: "15.12.2024",
    patientName: "Барсик",
    ownerName: "Иванов И.И.",
    items: [
      {
        id: "1",
        name: "Общий осмотр",
        type: 'service' as const,
        quantity: 1,
        price: 800,
        total: 800
      },
      {
        id: "2", 
        name: "Вакцинация против бешенства",
        type: 'service' as const,
        quantity: 1,
        price: 1500,
        total: 1500
      },
      {
        id: "3",
        name: "Витамины для кошек",
        type: 'product' as const,
        quantity: 2,
        price: 350,
        total: 700
      }
    ],
    subtotal: 3000,
    discount: 150,
    total: 2850,
    status: 'pending' as const,
    dueDate: "22.12.2024",
    notes: "Следующий визит через 2 недели для контрольного осмотра"
  },
  {
    id: "INV-2024-002",
    date: "14.12.2024",
    patientName: "Рекс",
    ownerName: "Сидоров П.К.",
    items: [
      {
        id: "4",
        name: "Хирургическая операция",
        type: 'service' as const,
        quantity: 1,
        price: 8500,
        total: 8500
      },
      {
        id: "5",
        name: "Анестезия",
        type: 'service' as const,
        quantity: 1,
        price: 2000,
        total: 2000
      }
    ],
    subtotal: 10500,
    total: 10500,
    status: 'paid' as const,
    paymentMethod: "Банковская карта"
  },
  {
    id: "INV-2024-003",
    date: "13.12.2024",
    patientName: "Мурка",
    ownerName: "Петрова А.С.",
    items: [
      {
        id: "6",
        name: "Консультация",
        type: 'service' as const,
        quantity: 1,
        price: 600,
        total: 600
      },
      {
        id: "7",
        name: "Лекарства",
        type: 'product' as const,
        quantity: 1,
        price: 320,
        total: 320
      }
    ],
    subtotal: 920,
    total: 920,
    status: 'overdue' as const,
    dueDate: "20.12.2024"
  }
]

export default function Finance() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("invoices")

  const filteredInvoices = mockInvoices.filter(invoice =>
    invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate statistics
  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const paidInvoices = mockInvoices.filter(inv => inv.status === 'paid')
  const pendingInvoices = mockInvoices.filter(inv => inv.status === 'pending')
  const overdueInvoices = mockInvoices.filter(inv => inv.status === 'overdue')
  
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-finance-title">Финансы и касса</h1>
          <p className="text-muted-foreground">Управление счетами, платежами и финансовой отчетностью</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-cash-register">
            <Banknote className="h-4 w-4 mr-2" />
            Касса
          </Button>
          <Button data-testid="button-new-invoice">
            <Plus className="h-4 w-4 mr-2" />
            Новый счет
          </Button>
        </div>
      </div>

      {/* Financial Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600" data-testid="text-total-revenue">
                  {totalRevenue.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-xs text-muted-foreground">Общая выручка</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-paid-amount">
                  {paidAmount.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-xs text-muted-foreground">Оплачено ({paidInvoices.length})</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-pending-amount">
                  {pendingAmount.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-xs text-muted-foreground">Ожидается ({pendingInvoices.length})</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600" data-testid="text-overdue-amount">
                  {overdueAmount.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-xs text-muted-foreground">Просрочено ({overdueInvoices.length})</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-300">
              <AlertCircle className="h-5 w-5" />
              Просроченные счета
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {overdueInvoices.map(invoice => (
                <Badge key={invoice.id} variant="destructive" className="text-xs">
                  {invoice.id}: {invoice.total.toLocaleString('ru-RU')} ₽
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск счетов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по номеру счета, владельцу или пациенту..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-invoices"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoices and Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            Счета ({filteredInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">
            Отчеты
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredInvoices.map(invoice => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
          {filteredInvoices.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Счета не найдены' : 'Счета отсутствуют'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                  <h3 className="font-medium">Отчет по выручке</h3>
                  <p className="text-sm text-muted-foreground">Детальный отчет по доходам за период</p>
                  <Button size="sm" data-testid="button-revenue-report">
                    Сформировать
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                  <h3 className="font-medium">Дебиторская задолженность</h3>
                  <p className="text-sm text-muted-foreground">Отчет по неоплаченным счетам</p>
                  <Button size="sm" data-testid="button-debt-report">
                    Сформировать
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground" />
                  <h3 className="font-medium">Аналитика платежей</h3>
                  <p className="text-sm text-muted-foreground">Статистика по способам оплаты</p>
                  <Button size="sm" data-testid="button-payment-analytics">
                    Сформировать
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}