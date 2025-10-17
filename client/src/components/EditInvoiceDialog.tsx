import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
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

const editInvoiceSchema = z.object({
  status: z.enum(["draft", "pending", "paid", "overdue", "cancelled"]),
  discount: z.coerce.number().min(0, "Скидка не может быть отрицательной").default(0),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
})

type EditInvoiceFormData = z.infer<typeof editInvoiceSchema>

interface EditInvoiceDialogProps {
  invoice: any
  open: boolean
  onClose: () => void
}

export default function EditInvoiceDialog({ invoice, open, onClose }: EditInvoiceDialogProps) {
  const { toast } = useToast()

  const form = useForm<EditInvoiceFormData>({
    resolver: zodResolver(editInvoiceSchema),
    defaultValues: {
      status: invoice.status || "pending",
      discount: parseFloat(invoice.discount || "0"),
      notes: invoice.notes || "",
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : "",
    },
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

  const onSubmit = (data: EditInvoiceFormData) => {
    updateInvoiceMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Редактирование счёта №{invoice.invoiceNumber?.replace('INV-', '') || invoice.id}</DialogTitle>
          <DialogDescription>
            {invoice.patientName} • {invoice.ownerName || 'Владелец не указан'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
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
            <div className="flex justify-between items-center p-3 bg-muted rounded-md">
              <span className="text-sm font-medium">Итого к оплате:</span>
              <span className="text-lg font-bold">
                {(() => {
                  // Вычисляем итоговую сумму правильно
                  const subtotal = parseFloat(invoice.subtotal || '0')
                  const currentDiscount = parseFloat(invoice.discount || '0')
                  const newDiscount = form.watch('discount')
                  
                  // Если есть subtotal, используем его; иначе пересчитываем из total
                  const baseAmount = subtotal > 0 ? subtotal : (parseFloat(invoice.total || '0') + currentDiscount)
                  const total = Math.max(0, baseAmount - newDiscount)
                  
                  return total.toLocaleString('ru-RU') + ' ₽'
                })()}
              </span>
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
