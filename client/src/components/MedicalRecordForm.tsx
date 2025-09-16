import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { insertMedicalRecordSchema, type InsertMedicalRecord, MEDICAL_RECORD_STATUS } from "@shared/schema"
import { apiRequest } from "@/lib/queryClient"
import { useState } from "react"

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

interface MedicalRecordFormProps {
  trigger?: React.ReactNode
}

export default function MedicalRecordForm({ trigger }: MedicalRecordFormProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch patients and doctors for dropdowns
  const { data: patients = [] } = useQuery({
    queryKey: ['/api/patients'],
    enabled: open
  })

  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
    enabled: open
  })

  const form = useForm<InsertMedicalRecord>({
    resolver: zodResolver(insertMedicalRecordSchema),
    defaultValues: {
      status: "active",
      visitDate: new Date(),
      visitType: "",
      patientId: "",
      doctorId: "",
      appointmentId: "",
      complaints: "",
      diagnosis: "",
      treatment: [],
      temperature: undefined,
      weight: undefined,
      nextVisit: undefined,
      notes: ""
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: InsertMedicalRecord) => {
      const response = await apiRequest('/api/medical-records', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        throw new Error('Failed to create medical record')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-records'] })
      toast({
        title: "Успех",
        description: "Медицинская запись успешно создана"
      })
      form.reset()
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
      treatment: data.treatment || []
    }
    createMutation.mutate(processedData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button data-testid="button-new-record">
            <Plus className="h-4 w-4 mr-2" />
            Новая запись
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать медицинскую запись</DialogTitle>
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
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пациент *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-patient">
                              <SelectValue placeholder="Выберите пациента" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {patients.map((patient: any) => (
                              <SelectItem key={patient.id} value={patient.id}>
                                {patient.name} ({patient.species})
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
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
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
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
                onClick={() => setOpen(false)}
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
                {createMutation.isPending ? "Сохранение..." : "Сохранить запись"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}