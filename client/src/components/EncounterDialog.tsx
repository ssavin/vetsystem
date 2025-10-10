import { useState, useEffect } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Plus, Stethoscope } from "lucide-react"

const encounterSchema = z.object({
  doctorId: z.string().min(1, "Выберите врача"),
  anamnesis: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  notes: z.string().optional(),
})

type EncounterFormValues = z.infer<typeof encounterSchema>

interface EncounterDialogProps {
  caseId: string
  patientName: string
  trigger?: React.ReactNode
  encounter?: {
    id: string
    doctorId: string
    anamnesis?: string | null
    diagnosis?: string | null
    treatmentPlan?: string | null
    notes?: string | null
  }
}

export default function EncounterDialog({ caseId, patientName, trigger, encounter }: EncounterDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const isEditMode = !!encounter

  // Fetch doctors list (from users with role 'врач')
  const { data: doctors = [] } = useQuery<Array<{
    id: string;
    name: string;
    specialization?: string;
  }>>({
    queryKey: ['/api/users/doctors'],
  })

  const form = useForm<EncounterFormValues>({
    resolver: zodResolver(encounterSchema),
    defaultValues: {
      doctorId: encounter?.doctorId || "",
      anamnesis: encounter?.anamnesis || "",
      diagnosis: encounter?.diagnosis || "",
      treatmentPlan: encounter?.treatmentPlan || "",
      notes: encounter?.notes || "",
    },
  })

  // Sync form with encounter data when it changes or dialog opens
  useEffect(() => {
    if (encounter && open) {
      form.reset({
        doctorId: encounter.doctorId || "",
        anamnesis: encounter.anamnesis || "",
        diagnosis: encounter.diagnosis || "",
        treatmentPlan: encounter.treatmentPlan || "",
        notes: encounter.notes || "",
      })
    }
  }, [encounter, open, form])

  const encounterMutation = useMutation({
    mutationFn: async (values: EncounterFormValues) => {
      if (isEditMode) {
        return await apiRequest('PATCH', `/api/encounters/${encounter.id}`, values)
      } else {
        return await apiRequest('POST', `/api/clinical-cases/${caseId}/encounters`, values)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clinical-cases', caseId] })
      toast({
        title: isEditMode ? "Обследование обновлено" : "Обследование создано",
        description: isEditMode 
          ? "Обследование успешно обновлено"
          : `Новое обследование для пациента ${patientName} успешно создано`,
      })
      setOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || (isEditMode ? "Не удалось обновить обследование" : "Не удалось создать обследование"),
        variant: "destructive",
      })
    },
  })

  const onSubmit = (values: EncounterFormValues) => {
    encounterMutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button data-testid="button-open-create-encounter">
            <Plus className="h-4 w-4 mr-2" />
            Новое обследование
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            {isEditMode ? "Редактировать обследование" : "Новое обследование"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? `Редактируйте данные обследования для пациента ${patientName}`
              : `Создайте новое обследование для пациента ${patientName}`
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          {doctor.name}
                          {doctor.specialization && ` • ${doctor.specialization}`}
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
              name="anamnesis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Анамнез</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Опишите историю болезни, жалобы владельца..."
                      className="min-h-[100px]"
                      data-testid="textarea-anamnesis"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    История болезни и жалобы на момент приема
                  </FormDescription>
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
                      placeholder="Укажите предварительный или окончательный диагноз..."
                      className="min-h-[80px]"
                      data-testid="textarea-diagnosis"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="treatmentPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>План лечения</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Опишите назначенное лечение, процедуры, медикаменты..."
                      className="min-h-[100px]"
                      data-testid="textarea-treatment-plan"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Назначения, процедуры и рекомендации
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
                      placeholder="Дополнительные заметки, особенности..."
                      className="min-h-[60px]"
                      data-testid="textarea-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-encounter"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={encounterMutation.isPending}
                data-testid="button-submit-encounter"
              >
                {encounterMutation.isPending 
                  ? (isEditMode ? "Сохранение..." : "Создание...") 
                  : (isEditMode ? "Сохранить изменения" : "Создать обследование")
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
