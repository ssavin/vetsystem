import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Microscope } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"

// Import shared schema for consistency
import { insertLabStudySchema } from "@shared/schema"

// Form validation schema - use shared schema subset for form fields
const labStudySchema = insertLabStudySchema.pick({
  name: true,
  category: true,
  description: true,
  isActive: true,
})

type LabStudyFormData = z.infer<typeof labStudySchema>

interface LabStudyDialogProps {
  children?: React.ReactNode
}

export default function LabStudyDialog({ children }: LabStudyDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<LabStudyFormData>({
    resolver: zodResolver(labStudySchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      isActive: true,
    },
  })

  const createStudyMutation = useMutation({
    mutationFn: async (data: LabStudyFormData) => {
      return apiRequest('POST', '/api/lab-studies', data)
    },
    onSuccess: () => {
      // Invalidate and refetch lab studies
      queryClient.invalidateQueries({ queryKey: ['/api/lab-studies'] })
      toast({
        title: "Успешно!",
        description: "Лабораторное исследование создано",
      })
      form.reset()
      setOpen(false)
    },
    onError: (error: any) => {
      console.error("Error creating lab study:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось создать лабораторное исследование",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: LabStudyFormData) => {
    createStudyMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button data-testid="button-add-study">
            <Plus className="h-4 w-4 mr-2" />
            Добавить исследование
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-add-study">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Microscope className="h-5 w-5 mr-2 text-primary" />
            Новое лабораторное исследование
          </DialogTitle>
          <DialogDescription>
            Создайте новое лабораторное исследование для использования в заказах
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название исследования *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Например: Общий анализ крови" 
                      {...field} 
                      data-testid="input-study-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Категория *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Например: Гематология" 
                      {...field} 
                      data-testid="input-study-category"
                    />
                  </FormControl>
                  <FormDescription>
                    Категория для группировки исследований
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Краткое описание исследования..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                      data-testid="textarea-study-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Активное исследование</FormLabel>
                    <FormDescription>
                      Активные исследования доступны для заказов
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-study-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel-study"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={createStudyMutation.isPending}
                data-testid="button-save-study"
              >
                {createStudyMutation.isPending ? "Создание..." : "Создать исследование"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}