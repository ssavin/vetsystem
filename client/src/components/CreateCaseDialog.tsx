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
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Plus, FileText } from "lucide-react"

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

interface CreateCaseDialogProps {
  patientId: string
  patientName: string
  trigger?: React.ReactNode
}

export default function CreateCaseDialog({ patientId, patientName, trigger }: CreateCaseDialogProps) {
  const [open, setOpen] = useState(false)
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
      return await apiRequest('POST', `/api/patients/${patientId}/clinical-cases`, values) as unknown as CreatedCaseResponse
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clinical-cases'] })
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/clinical-cases`] })
      toast({
        title: "Клинический случай создан",
        description: `Новый случай для пациента ${patientName} успешно создан`,
      })
      setOpen(false)
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

  const onSubmit = (values: CreateCaseFormValues) => {
    createCaseMutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid="button-open-create-case">
            <Plus className="h-4 w-4 mr-2" />
            Клинический случай
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Новый клинический случай
          </DialogTitle>
          <DialogDescription>
            Создайте новый клинический случай для пациента <strong>{patientName}</strong>
          </DialogDescription>
        </DialogHeader>
        
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
                      className="min-h-[120px]"
                      data-testid="textarea-reason-for-visit"
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
                data-testid="button-cancel-case"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createCaseMutation.isPending}
                data-testid="button-submit-case"
              >
                {createCaseMutation.isPending ? "Создание..." : "Создать случай"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
