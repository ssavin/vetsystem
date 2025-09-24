import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Banknote, TrendingUp, AlertCircle, FileText, Edit, Trash2, Eye, CreditCard, Receipt } from "lucide-react"
import InvoiceDialog from "@/components/InvoiceDialog"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"

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
  const { toast } = useToast()

  // Fetch real invoices from API
  const { data: invoices = [], isLoading: isLoadingInvoices, error } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => fetch('/api/invoices').then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
  })

  // Обработчик создания платежа через ЮKassa
  const handleYooKassaPayment = async (invoiceId: string) => {
    try {
      const response = await apiRequest('POST', '/api/payments/yookassa', {
        invoiceId,
        customerData: {
          // Можно добавить дополнительные данные клиента если нужно
        }
      })
      
      if (response.confirmationUrl) {
        // Открыть платежную страницу ЮKassa в новой вкладке
        window.open(response.confirmationUrl, '_blank')
        toast({
          title: "Платежная ссылка создана",
          description: "Откройте новую вкладку для завершения платежа"
        })
      }
    } catch (error: any) {
      toast({
        title: "Ошибка создания платежа",
        description: error.message || "Не удалось создать платеж",
        variant: "destructive"
      })
    }
  }

  // Обработчик печати фискального чека
  const handleFiscalReceipt = async (invoiceId: string) => {
    try {
      await apiRequest('POST', '/api/receipts/yookassa', {
        invoiceId,
        customerData: {
          // Можно добавить дополнительные данные клиента если нужно
        }
      })
      
      toast({
        title: "Фискальный чек создан",
        description: "Чек был успешно отправлен в ФНС согласно 54-ФЗ"
      })
    } catch (error: any) {
      toast({
        title: "Ошибка создания чека",
        description: error.message || "Не удалось создать фискальный чек",
        variant: "destructive"
      })
    }
  }

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter((invoice: any) =>
    (invoice.id && invoice.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (invoice.ownerName && invoice.ownerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (invoice.patientName && invoice.patientName.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : []


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
          <InvoiceDialog>
            <Button data-testid="button-new-invoice">
              <Plus className="h-4 w-4 mr-2" />
              Новый счет
            </Button>
          </InvoiceDialog>
        </div>
      </div>



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
          {filteredInvoices.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Счета не найдены' : 'Счета отсутствуют'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>№ счета</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Пациент</TableHead>
                      <TableHead>Владелец</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Срок оплаты</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map(invoice => (
                      <TableRow key={invoice.id} className="hover-elevate">
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>{invoice.date}</TableCell>
                        <TableCell>{invoice.patientName}</TableCell>
                        <TableCell>{invoice.ownerName}</TableCell>
                        <TableCell className="font-medium">
                          {invoice.total.toLocaleString('ru-RU')} ₽
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            invoice.status === 'paid' ? 'default' : 
                            invoice.status === 'pending' ? 'secondary' : 
                            'destructive'
                          }>
                            {invoice.status === 'paid' ? 'Оплачен' : 
                             invoice.status === 'pending' ? 'Ожидает' : 
                             'Просрочен'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.dueDate || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-view-invoice-${invoice.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-edit-invoice-${invoice.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {invoice.status !== 'paid' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700"
                                  data-testid={`button-pay-yookassa-${invoice.id}`}
                                  onClick={() => handleYooKassaPayment(invoice.id)}
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  data-testid={`button-fiscal-receipt-${invoice.id}`}
                                  onClick={() => handleFiscalReceipt(invoice.id)}
                                >
                                  <Receipt className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-delete-invoice-${invoice.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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