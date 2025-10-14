import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Receipt, Trash2, Calculator, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { translateSpecies, cn } from "@/lib/utils"

// Form validation schema for invoice creation
const invoiceItemSchema = z.object({
  name: z.string().min(1, "Название позиции обязательно"),
  type: z.enum(["service", "product"]),
  quantity: z.coerce.number().min(1, "Количество должно быть больше 0"),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной"),
  total: z.coerce.number().min(0),
  // Поля для фискальных чеков (54-ФЗ)
  vatRate: z.enum(['0', '10', '20', 'not_applicable']).default('20').optional(),
  productCode: z.string().optional(), // Для маркированных товаров
  markingStatus: z.string().optional(), // Статус маркировки 
  itemId: z.string().optional(), // Связь с каталогом
})

const invoiceFormSchema = z.object({
  patientId: z.string().min(1, "Выберите пациента"),
  items: z.array(invoiceItemSchema),
  discount: z.coerce.number().min(0, "Скидка не может быть отрицательной").default(0),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
})

type InvoiceFormData = z.infer<typeof invoiceFormSchema>

interface InvoiceDialogProps {
  children?: React.ReactNode
}

export default function InvoiceDialog({ children }: InvoiceDialogProps) {
  const [open, setOpen] = useState(false)
  const [itemPopoverStates, setItemPopoverStates] = useState<Record<number, boolean>>({})
  const { toast } = useToast()

  // Fetch data for dropdowns with reasonable limits
  const { data: patients = [] } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const res = await fetch('/api/patients?limit=200', {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch patients')
      const data = await res.json()
      return data.data || data
    },
    enabled: open
  })

  const { data: owners = [] } = useQuery({
    queryKey: ['/api/owners'],
    queryFn: async () => {
      const res = await fetch('/api/owners?limit=100', {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch owners')
      const data = await res.json()
      return data.data || data
    },
    enabled: open
  })

  const { data: services = [] } = useQuery({
    queryKey: ['/api/services'],
    enabled: open
  })

  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    enabled: open
  })

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      patientId: "",
      items: [],
      discount: 0,
      notes: "",
      dueDate: "",
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  })

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      // Calculate totals (ensure numbers, not strings)
      const subtotal = data.items.reduce((sum, item) => sum + Number(item.total), 0)
      const total = subtotal - Number(data.discount)

      const processedData = {
        ...data,
        subtotal,
        total,
        status: "pending" as const,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      }
      
      return apiRequest('POST', '/api/invoices', processedData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      toast({
        title: "Успех",
        description: "Счет успешно создан"
      })
      form.reset()
      setOpen(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка создания счета",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const onSubmit = (data: InvoiceFormData) => {
    // Проверяем, что есть хотя бы одна позиция
    if (data.items.length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте хотя бы одну позицию в счет",
        variant: "destructive"
      })
      return
    }
    
    createMutation.mutate(data)
  }

  // Calculate item total when quantity or price changes
  const calculateItemTotal = (index: number) => {
    const quantity = form.getValues(`items.${index}.quantity`)
    const price = form.getValues(`items.${index}.price`)
    const total = quantity * price
    form.setValue(`items.${index}.total`, total)
  }

  // Calculate total invoice amount
  const calculateTotals = () => {
    const items = form.getValues("items")
    const discount = form.getValues("discount")
    const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0)
    return { subtotal, total: subtotal - Number(discount || 0) }
  }

  const addServiceOrProduct = (itemType: "service" | "product", itemId: string) => {
    const allItems = itemType === "service" ? services : products
    const selectedItem = (allItems as any[]).find(item => item.id === itemId)
    
    if (selectedItem) {
      append({
        name: selectedItem.name,
        type: itemType,
        quantity: 1,
        price: selectedItem.price,
        total: selectedItem.price,
        // КРИТИЧНО: передаем НДС из синхронизированной номенклатуры для фискальных чеков
        vatRate: selectedItem.vat || (itemType === 'service' ? 'not_applicable' : '20'),
        // Дополнительные данные для маркированных товаров (54-ФЗ)
        productCode: selectedItem.markingCode,
        itemId: selectedItem.id // Для связи с каталогом
      })
    }
  }

  const totals = calculateTotals()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button data-testid="button-new-invoice">
            <Plus className="h-4 w-4 mr-2" />
            Новый счет
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto" data-testid="dialog-new-invoice">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Receipt className="h-5 w-5 mr-2 text-primary" />
            Создание нового счета
          </DialogTitle>
          <DialogDescription>
            Создайте счет для пациента с указанием услуг и товаров
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Patient Selection */}
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пациент *</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-patient">
                        <SelectValue placeholder="Выберите пациента" />
                      </SelectTrigger>
                      <SelectContent>
                        {(patients as any[]).map((patient: any) => {
                          const owner = (owners as any[]).find((o: any) => o.id === patient.ownerId)
                          return (
                            <SelectItem key={patient.id} value={patient.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{patient.name} ({translateSpecies(patient.species)})</span>
                                <span className="text-sm text-muted-foreground">
                                  Владелец: {owner?.name || 'Не указан'}
                                </span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quick Add Services/Products */}
            <div className="space-y-2">
              <FormLabel>Быстрое добавление</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Select onValueChange={(value) => addServiceOrProduct("service", value)}>
                    <SelectTrigger data-testid="select-add-service">
                      <SelectValue placeholder="Добавить услугу" />
                    </SelectTrigger>
                    <SelectContent>
                      {(services as any[]).map((service: any) => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex justify-between w-full">
                            <span>{service.name}</span>
                            <span className="text-muted-foreground ml-2">{service.price} ₽</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select onValueChange={(value) => addServiceOrProduct("product", value)}>
                    <SelectTrigger data-testid="select-add-product">
                      <SelectValue placeholder="Добавить товар" />
                    </SelectTrigger>
                    <SelectContent>
                      {(products as any[]).map((product: any) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex justify-between w-full">
                            <span>{product.name}</span>
                            <span className="text-muted-foreground ml-2">{product.price} ₽</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Позиции счета *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: "", type: "service", quantity: 1, price: 0, total: 0 })}
                  data-testid="button-add-item"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить позицию
                </Button>
              </div>

              {fields.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Нет позиций в счете</p>
                    <p className="text-sm">Используйте "Быстрое добавление" выше или кнопку "Добавить позицию"</p>
                  </CardContent>
                </Card>
              )}

              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.name`}
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Название</FormLabel>
                              <Popover 
                                open={itemPopoverStates[index] || false} 
                                onOpenChange={(isOpen) => {
                                  setItemPopoverStates(prev => ({ ...prev, [index]: isOpen }))
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Начните вводить или введите название вручную"
                                      data-testid={`input-item-name-${index}`}
                                      onFocus={() => {
                                        setItemPopoverStates(prev => ({ ...prev, [index]: true }))
                                      }}
                                    />
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                  <Command>
                                    <CommandInput 
                                      placeholder="Поиск услуги или товара..." 
                                      value={field.value}
                                      onValueChange={(value) => {
                                        field.onChange(value)
                                      }}
                                    />
                                    <CommandList>
                                      <CommandEmpty>Ничего не найдено</CommandEmpty>
                                      <CommandGroup heading="Услуги">
                                        {(services as any[]).map((service: any) => (
                                          <CommandItem
                                            key={`service:${service.id}`}
                                            value={service.name}
                                            onSelect={() => {
                                              form.setValue(`items.${index}.name`, service.name)
                                              form.setValue(`items.${index}.type`, "service")
                                              form.setValue(`items.${index}.price`, service.price)
                                              form.setValue(`items.${index}.vatRate`, service.vat || 'not_applicable')
                                              form.setValue(`items.${index}.productCode`, service.markingCode)
                                              form.setValue(`items.${index}.itemId`, service.id)
                                              setTimeout(() => calculateItemTotal(index), 0)
                                              setItemPopoverStates(prev => ({ ...prev, [index]: false }))
                                            }}
                                          >
                                            <div className="flex justify-between w-full">
                                              <span>{service.name}</span>
                                              <span className="text-muted-foreground ml-2">{service.price} ₽</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                      <CommandGroup heading="Товары">
                                        {(products as any[]).map((product: any) => (
                                          <CommandItem
                                            key={`product:${product.id}`}
                                            value={product.name}
                                            onSelect={() => {
                                              form.setValue(`items.${index}.name`, product.name)
                                              form.setValue(`items.${index}.type`, "product")
                                              form.setValue(`items.${index}.price`, product.price)
                                              form.setValue(`items.${index}.vatRate`, product.vat || '20')
                                              form.setValue(`items.${index}.productCode`, product.markingCode)
                                              form.setValue(`items.${index}.itemId`, product.id)
                                              setTimeout(() => calculateItemTotal(index), 0)
                                              setItemPopoverStates(prev => ({ ...prev, [index]: false }))
                                            }}
                                          >
                                            <div className="flex justify-between w-full">
                                              <span>{product.name}</span>
                                              <span className="text-muted-foreground ml-2">{product.price} ₽</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Тип</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger data-testid={`select-item-type-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="service">Услуга</SelectItem>
                                    <SelectItem value="product">Товар</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Кол-во</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(parseInt(e.target.value))
                                    setTimeout(() => calculateItemTotal(index), 0)
                                  }}
                                  data-testid={`input-item-quantity-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Цена</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(parseFloat(e.target.value))
                                    setTimeout(() => calculateItemTotal(index), 0)
                                  }}
                                  data-testid={`input-item-price-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.total`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Сумма</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  readOnly
                                  className="bg-muted"
                                  data-testid={`input-item-total-${index}`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Discount and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Скидка (₽)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        data-testid="input-discount"
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
                        data-testid="input-due-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Примечания</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Дополнительная информация о счете..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Totals Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Подытог:</span>
                    <span data-testid="text-subtotal">{totals.subtotal.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Скидка:</span>
                    <span data-testid="text-discount">-{form.getValues("discount").toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Итого:</span>
                    <span data-testid="text-total">{totals.total.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-create-invoice"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Создание..." : "Создать счет"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}