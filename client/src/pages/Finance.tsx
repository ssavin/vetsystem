import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { SystemSetting } from "@shared/schema"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Banknote, TrendingUp, AlertCircle, FileText, Edit, Trash2, Eye, CreditCard, Receipt, Printer } from "lucide-react"
import InvoiceDialog from "@/components/InvoiceDialog"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()

  // Обработчики событий для кнопок действий
  const handleViewInvoice = (invoiceId: string) => {
    const invoice = filteredInvoices.find(inv => inv.id === invoiceId)
    if (invoice) {
      setSelectedInvoice(invoice)
      setIsViewDialogOpen(true)
    }
  }

  const handleEditInvoice = (invoiceId: string) => {
    const invoice = filteredInvoices.find(inv => inv.id === invoiceId)
    if (invoice) {
      setSelectedInvoice(invoice)
      setIsEditDialogOpen(true)
    }
  }

  const handlePrintInvoice = (invoiceId: string) => {
    toast({
      title: "Печать счета",
      description: `Подготовка к печати счета ${invoiceId}`,
    })
    // TODO: Генерация PDF и открытие окна печати
    window.print()
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот счет? Это действие нельзя отменить.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast({
          title: "Счет удален",
          description: "Счет успешно удален из системы",
        })
        // Обновляем список счетов
        queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      } else {
        throw new Error('Не удалось удалить счет')
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить счет. Попробуйте еще раз.",
        variant: "destructive"
      })
    }
  }

  // Fetch real invoices from API
  const { data: invoices = [], isLoading: isLoadingInvoices, error } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: () => fetch('/api/invoices').then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
  })

  // Fetch system settings for fiscal receipt configuration
  const { data: systemSettings = [] } = useQuery<SystemSetting[]>({
    queryKey: ['/api/system-settings'],
    queryFn: () => fetch('/api/system-settings').then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
  })

  // Get current fiscal receipt system setting
  const fiscalReceiptSystem = systemSettings.find(s => s.key === 'fiscal_receipt_system')?.value || 'yookassa'

  // Обработчик создания платежа через ЮKassa
  const handleYooKassaPayment = async (invoiceId: string) => {
    try {
      const response = await apiRequest('POST', '/api/payments/yookassa', {
        invoiceId,
        customerData: {
          // Можно добавить дополнительные данные клиента если нужно
        }
      })
      
      const data = await response.json()
      if (data.confirmationUrl) {
        // Открыть платежную страницу ЮKassa в новой вкладке
        window.open(data.confirmationUrl, '_blank')
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
      // Выбираем endpoint в зависимости от настроенной системы печати
      const endpoint = fiscalReceiptSystem === 'moysklad' ? '/api/receipts/moysklad' : '/api/receipts/yookassa'
      
      await apiRequest('POST', endpoint, {
        invoiceId,
        customerData: {
          // Можно добавить дополнительные данные клиента если нужно
        }
      })
      
      const systemName = fiscalReceiptSystem === 'moysklad' ? 'Мой склад' : 'YooKassa'
      toast({
        title: "Фискальный чек создан",
        description: `Чек был успешно отправлен в ФНС через ${systemName} согласно 54-ФЗ`
      })
    } catch (error: any) {
      const systemName = fiscalReceiptSystem === 'moysklad' ? 'Мой склад' : 'YooKassa'
      toast({
        title: "Ошибка создания чека",
        description: error.message || `Не удалось создать фискальный чек через ${systemName}`,
        variant: "destructive"
      })
    }
  }

  // Фильтрация по номеру счета, имени пациента, имени владельца и заметкам
  const filteredInvoices = Array.isArray(invoices) ? invoices.filter((invoice: any) =>
    (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (invoice.patientName && invoice.patientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (invoice.ownerName && invoice.ownerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (invoice.notes && invoice.notes.toLowerCase().includes(searchTerm.toLowerCase()))
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
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Пациент</TableHead>
                      <TableHead>Владелец</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map(invoice => {
                      // Сокращаем номер счета для отображения
                      const shortInvoiceNumber = invoice.invoiceNumber?.replace('INV-', '') || invoice.id;
                      
                      // Форматируем дату
                      const formattedDate = invoice.issueDate 
                        ? new Date(invoice.issueDate).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric'
                          })
                        : '—';
                        
                      // Форматируем сумму
                      const formattedTotal = parseFloat(invoice.total || '0').toLocaleString('ru-RU');
                      
                      return (
                        <TableRow key={invoice.id} className="hover-elevate">
                          <TableCell className="font-medium text-sm">
                            {shortInvoiceNumber}
                          </TableCell>
                          <TableCell>{formattedDate}</TableCell>
                          <TableCell>
                            {invoice.patientName || '—'}
                            {invoice.patientSpecies && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({invoice.patientSpecies})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {invoice.ownerName || '—'}
                            {invoice.ownerPhone && (
                              <div className="text-xs text-muted-foreground">
                                {invoice.ownerPhone}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formattedTotal} ₽
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
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewInvoice(invoice.id)}
                                    data-testid={`button-view-invoice-${invoice.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Просмотр деталей счета</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditInvoice(invoice.id)}
                                    data-testid={`button-edit-invoice-${invoice.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Редактировать счет</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePrintInvoice(invoice.id)}
                                    data-testid={`button-print-invoice-${invoice.id}`}
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Распечатать счет</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {invoice.status !== 'paid' && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-green-600 hover:text-green-700"
                                        data-testid={`button-print-receipt-${invoice.id}`}
                                        onClick={() => handleFiscalReceipt(invoice.id)}
                                      >
                                        <CreditCard className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Печать чека</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                              </>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                    data-testid={`button-delete-invoice-${invoice.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Удалить счет</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                      )
                    })}
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
      
      {/* Диалог просмотра счета */}
      {selectedInvoice && isViewDialogOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setIsViewDialogOpen(false)}>
          <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <h2 className="text-lg font-semibold">Детали счета</h2>
              <p className="text-sm text-muted-foreground">
                Счет №{selectedInvoice.invoiceNumber?.replace('INV-', '') || selectedInvoice.id}
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Пациент</label>
                  <p className="text-sm">{selectedInvoice.patientName || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Владелец</label>
                  <p className="text-sm">{selectedInvoice.ownerName || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Дата создания</label>
                  <p className="text-sm">
                    {selectedInvoice.issueDate 
                      ? new Date(selectedInvoice.issueDate).toLocaleDateString('ru-RU')
                      : '—'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Статус</label>
                  <p className="text-sm">
                    {selectedInvoice.status === 'paid' ? 'Оплачен' : 
                     selectedInvoice.status === 'pending' ? 'Ожидает оплаты' : 
                     'Просрочен'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Сумма</label>
                  <p className="text-sm font-semibold">
                    {parseFloat(selectedInvoice.total || '0').toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>
              {selectedInvoice.notes && (
                <div>
                  <label className="text-sm font-medium">Заметки</label>
                  <p className="text-sm">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsViewDialogOpen(false)}
                data-testid="button-close-view-dialog"
              >
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Диалог редактирования счета */}
      {selectedInvoice && isEditDialogOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setIsEditDialogOpen(false)}>
          <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <h2 className="text-lg font-semibold">Редактирование счета</h2>
              <p className="text-sm text-muted-foreground">
                Счет №{selectedInvoice.invoiceNumber?.replace('INV-', '') || selectedInvoice.id}
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Редактирование счетов будет доступно в следующей версии системы.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Пациент</label>
                  <p className="text-sm">{selectedInvoice.patientName || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Владелец</label>
                  <p className="text-sm">{selectedInvoice.ownerName || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Статус</label>
                  <p className="text-sm">
                    {selectedInvoice.status === 'paid' ? 'Оплачен' : 
                     selectedInvoice.status === 'pending' ? 'Ожидает оплаты' : 
                     'Просрочен'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Сумма</label>
                  <p className="text-sm font-semibold">
                    {parseFloat(selectedInvoice.total || '0').toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                data-testid="button-close-edit-dialog"
              >
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}