import { useState, useEffect, useRef } from "react"
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Check, ChevronsUpDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { insertAppointmentSchema } from "@shared/schema"
import { cn, translateSpecies } from "@/lib/utils"

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
  ownerId: z.string().optional(), // Add owner selection
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

interface AppointmentDialogProps {
  children?: React.ReactNode
  defaultDate?: Date
  defaultOwnerId?: string
  defaultPatientId?: string
  defaultDoctorId?: string
  autoOpen?: boolean
  selectedAppointment?: any
  onClose?: () => void
}

export default function AppointmentDialog({ 
  children, 
  defaultDate, 
  defaultOwnerId,
  defaultPatientId,
  defaultDoctorId,
  autoOpen = false,
  selectedAppointment,
  onClose
}: AppointmentDialogProps) {
  const [open, setOpen] = useState(autoOpen)
  const [ownerSearchOpen, setOwnerSearchOpen] = useState(false)
  const [patientSearchOpen, setPatientSearchOpen] = useState(false)
  const { toast } = useToast()
  const hasAutoFilledRef = useRef(false)
  
  // Store loaded owner/patient to prevent loss when defaultIds change
  const [loadedOwner, setLoadedOwner] = useState<any>(null)
  const [loadedPatient, setLoadedPatient] = useState<any>(null)

  // Load specific owner if defaultOwnerId provided (from Registry)
  useQuery({
    queryKey: ['/api/owners', defaultOwnerId],
    queryFn: async () => {
      if (!defaultOwnerId) return null
      const res = await fetch(`/api/owners/${defaultOwnerId}`, {
        credentials: 'include'
      })
      if (!res.ok) return null
      const owner = await res.json()
      setLoadedOwner(owner) // Save to state
      return owner
    },
    enabled: open && !!defaultOwnerId
  })

  // Load specific patient if defaultPatientId provided (from Registry)
  useQuery({
    queryKey: ['/api/patients', defaultPatientId],
    queryFn: async () => {
      if (!defaultPatientId) return null
      const res = await fetch(`/api/patients/${defaultPatientId}`, {
        credentials: 'include'
      })
      if (!res.ok) return null
      const patient = await res.json()
      setLoadedPatient(patient) // Save to state
      return patient
    },
    enabled: open && !!defaultPatientId
  })

  // Load search lists only when NOT opening from Registry (no defaultIds)
  const { data: ownersList = [] } = useQuery({
    queryKey: ['/api/owners/all'],
    queryFn: async () => {
      const res = await fetch('/api/owners/all?limit=100', {
        credentials: 'include'
      })
      if (!res.ok) return []
      return res.json()
    },
    enabled: open && !defaultOwnerId
  })

  const { data: patientsList = [] } = useQuery({
    queryKey: ['/api/patients/all'],
    queryFn: async () => {
      const res = await fetch('/api/patients/all?limit=200', {
        credentials: 'include'
      })
      if (!res.ok) return []
      return res.json()
    },
    enabled: open && !defaultPatientId
  })

  // Combine loaded data: use saved single owner/patient OR search lists
  const owners = loadedOwner ? [loadedOwner] : ownersList
  const patients = loadedPatient ? [loadedPatient] : patientsList

  // Load all doctors (small list)
  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
    enabled: open
  })

  // Helper function to get nearest appointment time (round up to next 15 min interval)
  const getNearestAppointmentTime = () => {
    const now = new Date()
    const minutes = now.getMinutes()
    const roundedMinutes = Math.ceil(minutes / 15) * 15
    now.setMinutes(roundedMinutes)
    now.setSeconds(0)
    now.setMilliseconds(0)
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      ownerId: defaultOwnerId || "",
      patientId: defaultPatientId || "",
      doctorId: defaultDoctorId || "",
      appointmentDate: defaultDate 
        ? new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        : getNearestAppointmentTime(),
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
      // Invalidate all appointment queries (with any parameters)
      queryClient.invalidateQueries({ 
        queryKey: ['/api/appointments'],
        exact: false 
      })
      toast({
        title: "Успех",
        description: "Запись на прием успешно создана"
      })
      form.reset()
      setOpen(false)
      onClose?.()
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка создания записи",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      if (!selectedAppointment?.id) throw new Error("No appointment ID")
      
      const processedData = {
        ...data,
        appointmentDate: new Date(data.appointmentDate),
      }
      
      return apiRequest('PUT', `/api/appointments/${selectedAppointment.id}`, processedData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/appointments'],
        exact: false 
      })
      toast({
        title: "Успех",
        description: "Запись на прием успешно обновлена"
      })
      setOpen(false)
      onClose?.()
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка обновления записи",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAppointment?.id) throw new Error("No appointment ID")
      return apiRequest('DELETE', `/api/appointments/${selectedAppointment.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/appointments'],
        exact: false 
      })
      toast({
        title: "Успех",
        description: "Запись на прием успешно удалена"
      })
      setOpen(false)
      onClose?.()
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка удаления записи",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const onSubmit = (data: AppointmentFormData) => {
    if (selectedAppointment) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }
  
  const handleDelete = () => {
    if (confirm("Вы уверены, что хотите удалить эту запись?")) {
      deleteMutation.mutate()
    }
  }

  // Sync open state with autoOpen prop
  useEffect(() => {
    if (autoOpen) {
      setOpen(true)
    }
  }, [autoOpen])
  
  // Open dialog when selectedAppointment is set
  useEffect(() => {
    if (selectedAppointment) {
      setOpen(true)
      // Fill form with selected appointment data
      const aptDate = new Date(selectedAppointment.appointmentDate)
      const localDateString = new Date(aptDate.getTime() - aptDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      
      form.reset({
        ownerId: selectedAppointment.ownerId || '',
        patientId: selectedAppointment.patientId || '',
        doctorId: selectedAppointment.doctorId || '',
        appointmentDate: localDateString,
        duration: selectedAppointment.durationMinutes || selectedAppointment.duration || 30,
        appointmentType: selectedAppointment.appointmentType || '',
        status: selectedAppointment.status || 'scheduled',
        notes: selectedAppointment.notes || '',
      })
    }
  }, [selectedAppointment, form])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      hasAutoFilledRef.current = false
      setLoadedOwner(null)
      setLoadedPatient(null)
    }
  }, [open])

  // Auto-fill form when dialog opens with props - only once when dialog opens
  useEffect(() => {
    const doctorsList = doctors as any[]
    
    // Only reset if dialog is open AND we have default values AND haven't filled yet
    const shouldReset = open && (defaultOwnerId || defaultPatientId) && !hasAutoFilledRef.current
    
    if (shouldReset) {
      // Set form immediately with IDs
      const firstDoctor = defaultDoctorId 
        ? doctorsList.find((d: any) => d.id === defaultDoctorId)
        : doctorsList[0]
      
      const formData = {
        ownerId: defaultOwnerId || '',
        patientId: defaultPatientId || '',
        doctorId: firstDoctor?.id || '',
        appointmentDate: defaultDate 
          ? new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : getNearestAppointmentTime(),
        duration: 30,
        appointmentType: '',
        status: 'scheduled' as const,
        notes: '',
      }
      
      form.reset(formData)
      hasAutoFilledRef.current = true
    }
  }, [open, defaultOwnerId, defaultPatientId, defaultDoctorId, defaultDate, doctors, form])

  const appointmentTypes = [
    "Консультация",
    "Вакцинация", 
    "Осмотр",
    "Хирургия",
    "Диагностика",
    "Лечение",
    "Повторный прием"
  ]

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      onClose?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            {selectedAppointment ? 'Редактировать запись' : 'Новая запись на прием'}
          </DialogTitle>
          <DialogDescription>
            {selectedAppointment ? 'Измените данные записи на прием' : 'Создайте новую запись на прием для пациента'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Owner Selection with Search */}
            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => {
                const selectedOwner = (owners as any[]).find((o: any) => o.id === field.value)

                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Владелец/Клиент</FormLabel>
                    <Popover open={ownerSearchOpen} onOpenChange={setOwnerSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="select-owner"
                          >
                            {field.value ? (
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{selectedOwner?.name}</span>
                                {selectedOwner?.phone && (
                                  <span className="text-xs text-muted-foreground">
                                    {selectedOwner.phone}
                                  </span>
                                )}
                              </div>
                            ) : (
                              "Выберите владельца или введите для поиска"
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Поиск владельца по имени или телефону..." />
                          <CommandList>
                            <CommandEmpty>Владельцы не найдены</CommandEmpty>
                            <CommandGroup>
                              {(owners as any[]).map((owner: any) => {
                                const searchText = `${owner.name} ${owner.phone || ''}`.toLowerCase()
                                
                                return (
                                  <CommandItem
                                    key={owner.id}
                                    value={searchText}
                                    onSelect={() => {
                                      field.onChange(owner.id)
                                      form.setValue('patientId', '') // Reset patient when owner changes
                                      setOwnerSearchOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        owner.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{owner.name}</span>
                                      {owner.phone && (
                                        <span className="text-sm text-muted-foreground">
                                          {owner.phone}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            {/* Patient Selection with Search - filtered by owner if selected */}
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => {
                const selectedOwnerId = form.watch('ownerId')
                const filteredPatients = selectedOwnerId 
                  ? (patients as any[]).filter((p: any) => {
                      // Patient owners could be an array or a JSON string
                      const patientOwners = Array.isArray(p.owners) ? p.owners : (p.owners ? JSON.parse(p.owners) : [])
                      return patientOwners.some((po: any) => po.id === selectedOwnerId || po.ownerId === selectedOwnerId)
                    })
                  : (patients as any[])
                
                const selectedPatient = filteredPatients.find((p: any) => p.id === field.value)
                const selectedPatientOwners = selectedPatient 
                  ? (Array.isArray(selectedPatient.owners) ? selectedPatient.owners : (selectedPatient.owners ? JSON.parse(selectedPatient.owners) : []))
                  : []
                const selectedOwner = selectedPatientOwners.find((po: any) => po.isPrimary) || selectedPatientOwners[0]

                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Пациент *</FormLabel>
                    <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="select-patient"
                          >
                            {field.value ? (
                              <div className="flex flex-col items-start">
                                <span className="font-medium">
                                  {selectedPatient?.name} ({translateSpecies(selectedPatient?.species)})
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Владелец: {selectedOwner?.name || 'Не указан'}
                                </span>
                              </div>
                            ) : (
                              "Выберите пациента или введите для поиска"
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Поиск по пациенту или владельцу..." />
                          <CommandList>
                            <CommandEmpty>
                              {selectedOwnerId 
                                ? 'У выбранного владельца нет пациентов' 
                                : 'Пациенты не найдены'}
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredPatients.map((patient: any) => {
                                const patientOwners = Array.isArray(patient.owners) ? patient.owners : (patient.owners ? JSON.parse(patient.owners) : [])
                                const owner = patientOwners.find((po: any) => po.isPrimary) || patientOwners[0]
                                const searchText = `${patient.name} ${translateSpecies(patient.species)} ${owner?.name || ''}`.toLowerCase()
                                
                                return (
                                  <CommandItem
                                    key={patient.id}
                                    value={searchText}
                                    onSelect={() => {
                                      field.onChange(patient.id)
                                      setPatientSearchOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        patient.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {patient.name} ({translateSpecies(patient.species)})
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        Владелец: {owner?.name || 'Не указан'}
                                      </span>
                                    </div>
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )
              }}
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

            {/* Status - only show when editing */}
            {selectedAppointment && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Запланирован</SelectItem>
                          <SelectItem value="confirmed">Подтвержден</SelectItem>
                          <SelectItem value="in_progress">Идет прием</SelectItem>
                          <SelectItem value="completed">Завершен</SelectItem>
                          <SelectItem value="cancelled">Отменен</SelectItem>
                          <SelectItem value="no_show">Неявка</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              {selectedAppointment ? (
                <>
                  <Button 
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-appointment"
                  >
                    {deleteMutation.isPending ? "Удаление..." : "Удалить"}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    data-testid="button-save-appointment"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
                  </Button>
                </>
              ) : (
                <div className="ml-auto">
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-save-appointment"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {createMutation.isPending ? "Создание..." : "Создать запись"}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}