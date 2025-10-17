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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Редактирование счёта</DialogTitle>
          <DialogDescription>
            Счёт №{invoice.invoiceNumber?.replace('INV-', '') || invoice.id}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Информация о пациенте (только для просмотра) */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
              <div>
                <label className="text-sm font-medium">Пациент</label>
                <p className="text-sm">{invoice.patientName || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Владелец</label>
                <p className="text-sm">{invoice.ownerName || '—'}</p>
                {invoice.ownerPhone && (
                  <p className="text-xs text-muted-foreground">{invoice.ownerPhone}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Сумма (без скидки)</label>
                <p className="text-sm font-semibold">
                  {parseFloat(invoice.subtotal || invoice.total || '0').toLocaleString('ru-RU')} ₽
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Дата создания</label>
                <p className="text-sm">
                  {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('ru-RU') : '—'}
                </p>
              </div>
            </div>

            {/* Редактируемые поля */}
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Заметки</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация о счёте..."
                      {...field}
                      data-testid="textarea-invoice-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Итоговая сумма */}
            <div className="p-4 bg-primary/5 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Итоговая сумма:</span>
                <span className="text-xl font-bold">
                  {(parseFloat(invoice.subtotal || invoice.total || '0') - form.watch('discount')).toLocaleString('ru-RU')} ₽
                </span>
              </div>
              {form.watch('discount') > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Скидка: {form.watch('discount').toLocaleString('ru-RU')} ₽
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
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
