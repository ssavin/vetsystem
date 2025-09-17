import { useState, useMemo } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, AlertTriangle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"

// Form validation schema
const labResultSchema = z.object({
  orderId: z.string().min(1, "Заказ обязателен"),
  parameterId: z.string().min(1, "Параметр обязателен"),
  value: z.string().optional(),
  numericValue: z.string().refine((val) => !val || !isNaN(Number(val)), {
    message: "Должно быть числом",
  }).optional(),
  status: z.string().default("completed"),
  flags: z.string().optional(),
  notes: z.string().optional(),
})

type LabResultFormData = z.infer<typeof labResultSchema>

interface LabResultDialogProps {
  children?: React.ReactNode
}

export default function LabResultDialog({ children }: LabResultDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<string>("")
  const { toast } = useToast()

  const form = useForm<LabResultFormData>({
    resolver: zodResolver(labResultSchema),
    defaultValues: {
      orderId: "",
      parameterId: "",
      value: "",
      numericValue: "",
      status: "completed",
      flags: "",
      notes: "",
    },
  })

  // Fetch data for dropdowns
  const { data: labOrders = [] } = useQuery({
    queryKey: ['/api/lab-orders'],
  })

  const { data: labParameters = [] } = useQuery({
    queryKey: ['/api/lab-parameters'],
  })

  const { data: labStudies = [] } = useQuery({
    queryKey: ['/api/lab-studies'],
  })

  // Filter orders by status and get only pending/in_progress
  const availableOrders = useMemo(() => {
    return (labOrders as any[]).filter((order: any) => 
      order.status === 'pending' || order.status === 'in_progress'
    )
  }, [labOrders])

  // Get parameters for selected order
  const selectedOrderData = useMemo(() => {
    if (!selectedOrder) return null
    return (labOrders as any[]).find((order: any) => order.id === selectedOrder)
  }, [selectedOrder, labOrders])

  // Filter parameters by selected order's study
  const availableParameters = useMemo(() => {
    if (!selectedOrderData) return []
    return (labParameters as any[]).filter((param: any) => 
      param.studyId === selectedOrderData.studyId
    )
  }, [selectedOrderData, labParameters])

  const createResultMutation = useMutation({
    mutationFn: async (data: LabResultFormData) => {
      return apiRequest('POST', '/api/lab-result-details', {
        ...data,
        reportedDate: new Date().toISOString(),
      })
    },
    onSuccess: () => {
      // Invalidate and refetch lab results
      queryClient.invalidateQueries({ queryKey: ['/api/lab-result-details'] })
      toast({
        title: "Успешно!",
        description: "Результат анализа добавлен",
      })
      form.reset()
      setSelectedOrder("")
      setOpen(false)
    },
    onError: (error: any) => {
      console.error("Error creating lab result:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось добавить результат анализа",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: LabResultFormData) => {
    // Convert numericValue to number if present
    const processedData = {
      ...data,
      numericValue: data.numericValue ? Number(data.numericValue) : undefined,
    }
    createResultMutation.mutate(processedData)
  }

  // Handle order selection
  const handleOrderChange = (orderId: string) => {
    setSelectedOrder(orderId)
    form.setValue("orderId", orderId)
    form.setValue("parameterId", "") // Reset parameter when order changes
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button data-testid="button-add-result">
            <Plus className="h-4 w-4 mr-2" />
            Добавить результат
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-result">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary" />
            Новый результат анализа
          </DialogTitle>
          <DialogDescription>
            Добавьте результат выполненного лабораторного исследования
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="orderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Заказ на исследование *</FormLabel>
                  <Select onValueChange={handleOrderChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-order">
                        <SelectValue placeholder="Выберите заказ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableOrders.map((order: any) => {
                        const study = (labStudies as any[]).find(s => s.id === order.studyId)
                        return (
                          <SelectItem key={order.id} value={order.id}>
                            <div className="flex flex-col">
                              <div className="font-medium">
                                {study?.name || 'Неизвестное исследование'}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                Заказ #{order.id.slice(-8)}
                                <Badge variant={order.status === 'pending' ? 'secondary' : 'default'} className="text-xs">
                                  {order.status === 'pending' ? 'Ожидает' : 'В процессе'}
                                </Badge>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedOrder && (
              <FormField
                control={form.control}
                name="parameterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Параметр исследования *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-parameter">
                          <SelectValue placeholder="Выберите параметр" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableParameters.map((param: any) => (
                          <SelectItem key={param.id} value={param.id}>
                            <div className="flex flex-col">
                              <div className="font-medium">{param.name}</div>
                              {param.unit && (
                                <div className="text-xs text-muted-foreground">
                                  Единица измерения: {param.unit}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Текстовое значение</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Например: положительный"
                        {...field} 
                        data-testid="input-text-value"
                      />
                    </FormControl>
                    <FormDescription>
                      Для качественных результатов
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numericValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Числовое значение</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Например: 5.2"
                        type="number"
                        step="0.01"
                        {...field} 
                        data-testid="input-numeric-value"
                      />
                    </FormControl>
                    <FormDescription>
                      Для количественных результатов
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус результата</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-result-status">
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="completed">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Завершен
                          </div>
                        </SelectItem>
                        <SelectItem value="pending">Ожидает проверки</SelectItem>
                        <SelectItem value="reviewed">Проверен</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="flags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Флаги</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-flags">
                          <SelectValue placeholder="Выберите флаг" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Норма
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                            Повышен
                          </div>
                        </SelectItem>
                        <SelectItem value="low">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2 text-blue-600" />
                            Понижен
                          </div>
                        </SelectItem>
                        <SelectItem value="abnormal">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                            Патология
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Комментарии</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Дополнительные комментарии к результату..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                      data-testid="textarea-result-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel-result"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={createResultMutation.isPending}
                data-testid="button-save-result"
              >
                {createResultMutation.isPending ? "Добавление..." : "Добавить результат"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}