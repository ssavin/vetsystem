import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Trash2, Plus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const editInvoiceSchema = z.object({
  status: z.enum(["draft", "pending", "paid", "overdue", "cancelled"]),
  discount: z.coerce.number().min(0, "Скидка не может быть отрицательной").default(0),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  subtotal: z.number().optional(),
  total: z.number().optional(),
})

type EditInvoiceFormData = z.infer<typeof editInvoiceSchema>

interface EditInvoiceDialogProps {
  invoice: any
  open: boolean
  onClose: () => void
}

export default function EditInvoiceDialog({ invoice, open, onClose }: EditInvoiceDialogProps) {
  const { toast } = useToast()
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemType, setNewItemType] = useState<'service' | 'product'>('service')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState(1)

  const form = useForm<EditInvoiceFormData>({
    resolver: zodResolver(editInvoiceSchema),
    defaultValues: {
      status: invoice.status || "pending",
      discount: parseFloat(invoice.discount || "0"),
      notes: invoice.notes || "",
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : "",
    },
  })

  // Загрузка позиций счёта
  const { data: invoiceItems = [], refetch: refetchItems } = useQuery({
    queryKey: ['/api/invoices', invoice.id, 'items'],
    enabled: !!invoice.id && open,
  })

  // Загрузка услуг
  const { data: services = [] } = useQuery({
    queryKey: ['/api/services'],
    enabled: open && newItemType === 'service',
  })

  // Загрузка товаров
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    enabled: open && newItemType === 'product',
  })

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice) {
      form.reset({
        status: invoice.status || "pending",
        discount: parseFloat(invoice.discount || "0"),
        notes: invoice.notes || "",
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : "",
      })
    }
  }, [invoice, form])

  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: EditInvoiceFormData) => {
      return await apiRequest('PUT', `/api/invoices/${invoice.id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      toast({
        title: "Счёт обновлён",
        description: "Изменения успешно сохранены",
      })
      onClose()
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось обновить счёт",
      })
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest('DELETE', `/api/invoice-items/${itemId}`)
    },
    onSuccess: () => {
      toast({
        title: "Позиция удалена",
      })
      refetchItems()
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить позицию",
        variant: "destructive",
      })
    },
  })

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const item = newItemType === 'service' 
        ? services.find((s: any) => s.id === selectedItemId)
        : products.find((p: any) => p.id === selectedItemId)
      
      if (!item) throw new Error('Товар/услуга не найдена')

      const price = parseFloat(item.price || '0')
      const total = price * quantity

      return await apiRequest('POST', '/api/invoice-items', {
        invoiceId: invoice.id,
        itemType: newItemType,
        itemId: selectedItemId,
        itemName: item.name,
        quantity,
        price,
        total,
        vatRate: item.vatRate || '20',
      })
    },
    onSuccess: () => {
      toast({
        title: "Позиция добавлена",
      })
      setShowAddItem(false)
      setSelectedItemId('')
      setQuantity(1)
      refetchItems()
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить позицию",
        variant: "destructive",
      })
    },
  })

  const itemsTotal = invoiceItems.reduce((sum: number, item: any) => sum + parseFloat(item.total || '0'), 0)
  
  const onSubmit = (data: EditInvoiceFormData) => {
    // Пересчитываем итоговую сумму на основе позиций счёта и скидки
    const discount = data.discount || 0
    const subtotal = itemsTotal
    const total = subtotal - discount
    
    // Отправляем обновлённые данные вместе с пересчитанным total
    updateInvoiceMutation.mutate({
      ...data,
      subtotal,
      total,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактирование счёта №{invoice.invoiceNumber?.replace('INV-', '') || invoice.id}</DialogTitle>
          <DialogDescription>
            {invoice.patientName} • {invoice.ownerName || 'Владелец не указан'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Позиции счёта */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Позиции счёта</FormLabel>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddItem(!showAddItem)}
                  data-testid="button-toggle-add-item"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Добавить
                </Button>
              </div>

              {/* Форма добавления позиции */}
              {showAddItem && (
                <div className="p-3 border rounded-md space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newItemType} onValueChange={(v: 'service' | 'product') => setNewItemType(v)}>
                      <SelectTrigger data-testid="select-item-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="service">Услуга</SelectItem>
                        <SelectItem value="product">Товар</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger data-testid="select-item">
                        <SelectValue placeholder={`Выберите ${newItemType === 'service' ? 'услугу' : 'товар'}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(newItemType === 'service' ? services : products).map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} - {parseFloat(item.price || '0').toLocaleString('ru-RU')} ₽
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      placeholder="Количество"
                      data-testid="input-item-quantity"
                    />
                    <Button
                      type="button"
                      onClick={() => addItemMutation.mutate()}
                      disabled={!selectedItemId || addItemMutation.isPending}
                      data-testid="button-add-item"
                    >
                      {addItemMutation.isPending ? "Добавление..." : "Добавить"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Таблица позиций */}
              {invoiceItems.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead className="w-20">Кол-во</TableHead>
                        <TableHead className="w-24">Цена</TableHead>
                        <TableHead className="w-24">Сумма</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{item.itemName}</TableCell>
                          <TableCell className="text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-sm">{parseFloat(item.price || '0').toLocaleString('ru-RU')} ₽</TableCell>
                          <TableCell className="text-sm font-medium">{parseFloat(item.total || '0').toLocaleString('ru-RU')} ₽</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              disabled={deleteItemMutation.isPending}
                              data-testid={`button-delete-item-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Позиции отсутствуют</p>
              )}
            </div>

            {/* Редактируемые поля */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-invoice-status">
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Черновик</SelectItem>
                        <SelectItem value="pending">Ожидает оплаты</SelectItem>
                        <SelectItem value="paid">Оплачен</SelectItem>
                        <SelectItem value="overdue">Просрочен</SelectItem>
                        <SelectItem value="cancelled">Отменён</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Срок оплаты</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={invoice.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : undefined}
                        {...field}
                        data-testid="input-invoice-due-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Скидка (₽)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      {...field}
                      data-testid="input-invoice-discount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Заметки</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация..."
                      rows={3}
                      {...field}
                      data-testid="textarea-invoice-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Итоговая сумма */}
            <div className="p-3 bg-muted rounded-md space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Сумма позиций:</span>
                <span className="text-sm font-medium">{itemsTotal.toLocaleString('ru-RU')} ₽</span>
              </div>
              {form.watch('discount') > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Скидка:</span>
                  <span className="text-sm">-{form.watch('discount').toLocaleString('ru-RU')} ₽</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-sm font-medium">Итого к оплате:</span>
                <span className="text-lg font-bold">
                  {Math.max(0, itemsTotal - form.watch('discount')).toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-edit"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={updateInvoiceMutation.isPending}
                data-testid="button-save-invoice"
              >
                {updateInvoiceMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
