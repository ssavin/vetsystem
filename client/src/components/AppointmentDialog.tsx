import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { insertAppointmentSchema } from "@shared/schema"

// Form validation schema - use shared schema subset for form fields
const appointmentFormSchema = insertAppointmentSchema.pick({
  patientId: true,
  doctorId: true,
  appointmentDate: true,
  duration: true,
  appointmentType: true,
  status: true,
  notes: true,
}).extend({
  appointmentDate: z.string().min(1, "Дата и время приема обязательны"),
  appointmentType: z.string().min(1, "Тип приема обязателен"),
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

interface AppointmentDialogProps {
  children?: React.ReactNode
  defaultDate?: Date
}

export default function AppointmentDialog({ children, defaultDate }: AppointmentDialogProps) {
  const [open, setOpen] = useState(false)
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

  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
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

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      appointmentDate: defaultDate 
        ? new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        : "",
      duration: 30,
      appointmentType: "",
      status: "scheduled",
      notes: "",
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      // Convert datetime string back to Date for API
      const processedData = {
        ...data,
        appointmentDate: new Date(data.appointmentDate),
      }
      
      return apiRequest('POST', '/api/appointments', processedData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] })
      toast({
        title: "Успех",
        description: "Запись на прием успешно создана"
      })
      form.reset()
      setOpen(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка создания записи",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const onSubmit = (data: AppointmentFormData) => {
    createMutation.mutate(data)
  }

  const appointmentTypes = [
    "Консультация",
    "Вакцинация", 
    "Осмотр",
    "Хирургия",
    "Диагностика",
    "Лечение",
    "Повторный прием"
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button data-testid="button-add-appointment">
            <Plus className="h-4 w-4 mr-2" />
            Новая запись
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-appointment">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            Новая запись на прием
          </DialogTitle>
          <DialogDescription>
            Создайте новую запись на прием для пациента
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                <span className="font-medium">{patient.name} ({patient.species})</span>
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

            {/* Doctor Selection */}
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Врач *</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-doctor">
                        <SelectValue placeholder="Выберите врача" />
                      </SelectTrigger>
                      <SelectContent>
                        {(doctors as any[]).map((doctor: any) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{doctor.name}</span>
                              <span className="text-sm text-muted-foreground">{doctor.specialization}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Appointment Date & Time */}
            <FormField
              control={form.control}
              name="appointmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дата и время *</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local"
                      {...field} 
                      data-testid="input-appointment-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration & Type */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Длительность (мин) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="15"
                        step="15"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип приема *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-appointment-type">
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          {appointmentTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <FormLabel>Заметки</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Дополнительная информация о приеме..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-appointment-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-save-appointment"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Создание..." : "Создать запись"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}