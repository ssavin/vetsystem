import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { insertMedicalRecordSchema, type InsertMedicalRecord, MEDICAL_RECORD_STATUS } from "@shared/schema"
import { apiRequest } from "@/lib/queryClient"
import { useState, useEffect } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Save, X, Calendar, User, Stethoscope, Thermometer, Weight } from "lucide-react"
import OwnerPatientSearchDialog from "./OwnerPatientSearchDialog"

interface MedicalRecordFormProps {
  trigger?: React.ReactNode
  recordToEdit?: any
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function MedicalRecordForm({ trigger, recordToEdit, open: controlledOpen, onOpenChange }: MedicalRecordFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string
    name: string
    ownerId: string
    ownerName: string
  } | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isEditing = !!recordToEdit

  // Only fetch doctors - no owners or patients needed with search dialog

  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
    queryFn: async () => {
      const res = await fetch('/api/doctors', {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch doctors')
      return res.json()
    },
    enabled: open
  })

  // Handle patient selection from search dialog
  const handlePatientSelect = (patientId: string, patientName: string, ownerId: string, ownerName: string) => {
    setSelectedPatient({ id: patientId, name: patientName, ownerId, ownerName })
    form.setValue('patientId', patientId)
  }

  const form = useForm<InsertMedicalRecord>({
    resolver: zodResolver(insertMedicalRecordSchema),
    defaultValues: {
      status: "active",
      visitDate: new Date(),
      visitType: "",
      patientId: "",
      doctorId: "",
      appointmentId: null,
      complaints: "",
      diagnosis: "",
      treatment: [],
      temperature: undefined,
      weight: undefined,
      nextVisit: undefined,
      notes: ""
    }
  })

  // Load record data when editing
  useEffect(() => {
    if (recordToEdit && open) {
      form.reset({
        status: recordToEdit.status || "active",
        visitDate: recordToEdit.visitDate ? new Date(recordToEdit.visitDate) : new Date(),
        visitType: recordToEdit.visitType || "",
        patientId: recordToEdit.patientId || "",
        doctorId: recordToEdit.doctorId || "",
        appointmentId: recordToEdit.appointmentId || null,
        complaints: recordToEdit.complaints || "",
        diagnosis: recordToEdit.diagnosis || "",
        treatment: recordToEdit.treatment || [],
        temperature: recordToEdit.temperature || undefined,
        weight: recordToEdit.weight || undefined,
        nextVisit: recordToEdit.nextVisit ? new Date(recordToEdit.nextVisit) : undefined,
        notes: recordToEdit.notes || ""
      })
    } else if (!open) {
      form.reset()
      setSelectedPatient(null)
    }
  }, [recordToEdit, open, form])

  const createMutation = useMutation({
    mutationFn: async (data: InsertMedicalRecord) => {
      const response = await apiRequest('POST', '/api/medical-records', data)
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-records'] })
      toast({
        title: "Успех",
        description: "Клинический случай успешно создан"
      })
      form.reset()
      setSelectedPatient(null)
      setOpen(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: InsertMedicalRecord) => {
      const response = await apiRequest('PUT', `/api/medical-records/${recordToEdit.id}`, data)
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-records'] })
      toast({
        title: "Успех",
        description: "Запись успешно обновлена"
      })
      form.reset()
      setSelectedPatient(null)
      setOpen(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const onSubmit = (data: InsertMedicalRecord) => {
    // Convert treatment string to array if it's a string
    const processedData = {
      ...data,
      treatment: data.treatment || [],
      appointmentId: data.appointmentId || null,
    }
    
    if (isEditing) {
      updateMutation.mutate(processedData)
    } else {
      createMutation.mutate(processedData)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!recordToEdit && (
        <DialogTrigger asChild>
          {trigger || (
            <Button data-testid="button-new-record">
              <Plus className="h-4 w-4 mr-2" />
              Новая запись
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Редактирование записи' : 'Создание клинического случая'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Основная информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isEditing ? (
                    <>
                      {/* Read-only display when editing */}
                      <div className="md:col-span-2">
                        <Label className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4" />
                          Пациент
                        </Label>
                        <Input 
                          value={recordToEdit?.patientName || 'Загрузка...'} 
                          disabled 
                          data-testid="input-patient-readonly"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Patient Search Dialog */}
                      <div className="md:col-span-2">
                        <Label className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4" />
                          Владелец и пациент *
                        </Label>
                        {selectedPatient ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={`${selectedPatient.ownerName} → ${selectedPatient.name}`}
                              disabled
                              data-testid="input-selected-patient"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPatient(null)
                                form.setValue('patientId', '')
                              }}
                              data-testid="button-clear-patient"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <OwnerPatientSearchDialog
                            onSelectPatient={handlePatientSelect}
                            placeholder="Поиск по ФИО владельца или кличке животного..."
                          />
                        )}
                        {form.formState.errors.patientId && (
                          <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.patientId.message}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="doctorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Врач *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-doctor">
                              <SelectValue placeholder="Выберите врача" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {doctors.map((doctor: any) => (
                              <SelectItem key={doctor.id} value={doctor.id}>
                                {doctor.name} {doctor.specialization && `(${doctor.specialization})`}
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
                    name="visitDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Дата визита *</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-visit-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="visitType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тип визита *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Плановый осмотр, консультация, операция..."
                            data-testid="input-visit-type"
                          />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Выберите статус" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Активное лечение</SelectItem>
                            <SelectItem value="completed">Завершено</SelectItem>
                            <SelectItem value="follow_up_required">Требует наблюдения</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nextVisit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Следующий визит</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            data-testid="input-next-visit"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Clinical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Клиническая информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Thermometer className="h-3 w-3" />
                          Температура (°C)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            min={30}
                            max={45}
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || undefined)}
                            placeholder="38.5"
                            data-testid="input-temperature"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Weight className="h-3 w-3" />
                          Вес (кг)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            min={0}
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || undefined)}
                            placeholder="4.2"
                            data-testid="input-weight"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="complaints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Жалобы</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          value={field.value || ""}
                          placeholder="Опишите жалобы и симптомы..."
                          rows={3}
                          data-testid="textarea-complaints"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Диагноз</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          value={field.value || ""}
                          placeholder="Поставленный диагноз..."
                          rows={3}
                          data-testid="textarea-diagnosis"
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
                      <FormLabel>Дополнительные заметки</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          value={field.value || ""}
                          placeholder="Дополнительная информация, рекомендации..."
                          rows={3}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex gap-4 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setOpen(false)
                  setSelectedPatient(null)
                  form.reset()
                }}
                data-testid="button-cancel"
              >
                <X className="h-4 w-4 mr-2" />
                Отменить
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-save-record"
              >
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Создание..." : "Создать случай"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}