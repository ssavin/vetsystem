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
import { Textarea } from "@/components/ui/textarea"
import { Plus, ClipboardList, User, Stethoscope, Microscope } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"

// Form validation schema
const labOrderSchema = z.object({
  patientId: z.string().min(1, "Пациент обязателен"),
  doctorId: z.string().min(1, "Врач обязателен"),
  studyId: z.string().min(1, "Исследование обязательно"),
  status: z.string().default("pending"),
  priority: z.string().default("normal"),
  clinicalInfo: z.string().optional(),
  notes: z.string().optional(),
})

type LabOrderFormData = z.infer<typeof labOrderSchema>

interface LabOrderDialogProps {
  children?: React.ReactNode
}

export default function LabOrderDialog({ children }: LabOrderDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<LabOrderFormData>({
    resolver: zodResolver(labOrderSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      studyId: "",
      status: "pending",
      priority: "normal",
      clinicalInfo: "",
      notes: "",
    },
  })

  // Fetch data for dropdowns
  const { data: patients = [] } = useQuery({
    queryKey: ['/api/patients'],
  })

  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
  })

  const { data: labStudies = [] } = useQuery({
    queryKey: ['/api/lab-studies'],
  })

  // Filter active studies
  const activeStudies = useMemo(() => {
    return (labStudies as any[]).filter((study: any) => study.isActive !== false)
  }, [labStudies])

  const createOrderMutation = useMutation({
    mutationFn: async (data: LabOrderFormData) => {
      return apiRequest('POST', '/api/lab-orders', {
        ...data,
        orderedDate: new Date().toISOString(),
      })
    },
    onSuccess: () => {
      // Invalidate and refetch lab orders
      queryClient.invalidateQueries({ queryKey: ['/api/lab-orders'] })
      toast({
        title: "Успешно!",
        description: "Лабораторный заказ создан",
      })
      form.reset()
      setOpen(false)
    },
    onError: (error: any) => {
      console.error("Error creating lab order:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось создать лабораторный заказ",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: LabOrderFormData) => {
    createOrderMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button data-testid="button-add-order">
            <Plus className="h-4 w-4 mr-2" />
            Новый заказ
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-order">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-primary" />
            Новый лабораторный заказ
          </DialogTitle>
          <DialogDescription>
            Создайте заказ на лабораторное исследование для пациента
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пациент *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-patient">
                          <SelectValue placeholder="Выберите пациента" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(patients as any[]).map((patient: any) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              {patient.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Врач *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-doctor">
                          <SelectValue placeholder="Выберите врача" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(doctors as any[]).map((doctor: any) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            <div className="flex items-center">
                              <Stethoscope className="h-4 w-4 mr-2" />
                              {doctor.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="studyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Лабораторное исследование *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-study">
                        <SelectValue placeholder="Выберите исследование" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeStudies.map((study: any) => (
                        <SelectItem key={study.id} value={study.id}>
                          <div className="flex items-center">
                            <Microscope className="h-4 w-4 mr-2" />
                            <div>
                              <div className="font-medium">{study.name}</div>
                              {study.description && (
                                <div className="text-xs text-muted-foreground">{study.description}</div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Приоритет</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue placeholder="Выберите приоритет" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Низкий</SelectItem>
                        <SelectItem value="normal">Обычный</SelectItem>
                        <SelectItem value="high">Высокий</SelectItem>
                        <SelectItem value="urgent">Срочный</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Ожидает</SelectItem>
                        <SelectItem value="in_progress">В процессе</SelectItem>
                        <SelectItem value="completed">Завершен</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="clinicalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Клиническая информация</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Клинические данные, симптомы, анамнез..."
                      className="resize-none"
                      rows={2}
                      {...field} 
                      data-testid="textarea-clinical-info"
                    />
                  </FormControl>
                  <FormDescription>
                    Дополнительная информация для лаборатории
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Примечания</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Дополнительные примечания..."
                      className="resize-none"
                      rows={2}
                      {...field} 
                      data-testid="textarea-notes"
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
                data-testid="button-cancel-order"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={createOrderMutation.isPending}
                data-testid="button-save-order"
              >
                {createOrderMutation.isPending ? "Создание..." : "Создать заказ"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}