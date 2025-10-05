import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useLocation } from "wouter"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Plus, FileText, ArrowLeft } from "lucide-react"
import OwnerPatientSearchDialog from "./OwnerPatientSearchDialog"

const createCaseSchema = z.object({
  reasonForVisit: z.string().min(10, "Причина визита должна содержать минимум 10 символов"),
})

type CreateCaseFormValues = z.infer<typeof createCaseSchema>

interface CreatedCaseResponse {
  id: string
  patientId: string
  reasonForVisit: string
  status: string
  startDate: string
}

export default function CreateCaseWithSearchDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'search' | 'form'>('search')
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string
    name: string
    ownerId: string
    ownerName: string
  } | null>(null)
  const [, navigate] = useLocation()
  const { toast } = useToast()

  const form = useForm<CreateCaseFormValues>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: {
      reasonForVisit: "",
    },
  })

  const createCaseMutation = useMutation<CreatedCaseResponse, Error, CreateCaseFormValues>({
    mutationFn: async (values: CreateCaseFormValues) => {
      if (!selectedPatient) {
        throw new Error("Пациент не выбран")
      }
      const response = await apiRequest('POST', `/api/patients/${selectedPatient.id}/clinical-cases`, values)
      return await response.json() as CreatedCaseResponse
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clinical-cases'] })
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatient?.id}/clinical-cases`] })
      toast({
        title: "Клинический случай создан",
        description: `Новый случай для пациента ${selectedPatient?.name} успешно создан`,
      })
      setOpen(false)
      setStep('search')
      setSelectedPatient(null)
      form.reset()
      navigate(`/clinical-cases/${data.id}`)
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать клинический случай",
        variant: "destructive",
      })
    },
  })

  const handlePatientSelect = (patientId: string, patientName: string, ownerId: string, ownerName: string) => {
    setSelectedPatient({ id: patientId, name: patientName, ownerId, ownerName })
    setStep('form')
  }

  const handleBack = () => {
    setStep('search')
    setSelectedPatient(null)
  }

  const onSubmit = (values: CreateCaseFormValues) => {
    createCaseMutation.mutate(values)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setStep('search')
      setSelectedPatient(null)
      form.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-case-with-search">
          <Plus className="h-4 w-4 mr-2" />
          Создать случай
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {step === 'search' ? 'Выбор пациента' : 'Новый клинический случай'}
          </DialogTitle>
          <DialogDescription>
            {step === 'search' 
              ? 'Найдите владельца и выберите пациента для создания клинического случая'
              : `Создайте новый клинический случай для пациента ${selectedPatient?.name}`
            }
          </DialogDescription>
        </DialogHeader>
        
        {step === 'search' && (
          <OwnerPatientSearchDialog onSelectPatient={handlePatientSelect} />
        )}

        {step === 'form' && selectedPatient && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium">{selectedPatient.name}</div>
                <div className="text-xs text-muted-foreground">Владелец: {selectedPatient.ownerName}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                data-testid="button-back-to-search"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Изменить
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="reasonForVisit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Причина визита *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Опишите причину обращения и основные жалобы..."
                          className="min-h-[150px]"
                          data-testid="textarea-reason-for-visit"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    data-testid="button-cancel-case"
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCaseMutation.isPending}
                    data-testid="button-submit-case"
                  >
                    {createCaseMutation.isPending ? 'Создание...' : 'Создать случай'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
