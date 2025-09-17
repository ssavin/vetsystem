import { useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Plus, Settings2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"

// Form validation schema  
const labParameterSchema = z.object({
  studyId: z.string().min(1, "Исследование обязательно"),
  name: z.string().min(1, "Название параметра обязательно").max(200, "Название слишком длинное"),
  description: z.string().optional(),
  unit: z.string().optional(),
  dataType: z.enum(["numeric", "text", "boolean"]).default("numeric"),
  sortOrder: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
  referenceMin: z.number().optional(),
  referenceMax: z.number().optional(),
  species: z.string().optional(),
})

type LabParameterFormData = z.infer<typeof labParameterSchema>

interface LabParameterDialogProps {
  children?: React.ReactNode
  studyId?: string // Pre-select study if provided
}

export default function LabParameterDialog({ children, studyId }: LabParameterDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<LabParameterFormData>({
    resolver: zodResolver(labParameterSchema),
    defaultValues: {
      studyId: studyId || "",
      name: "",
      description: "",
      unit: "",
      dataType: "numeric",
      sortOrder: 0,
      isRequired: true,
      referenceMin: undefined,
      referenceMax: undefined,
      species: "",
    },
  })

  // Fetch lab studies for dropdown
  const { data: labStudies = [] } = useQuery({
    queryKey: ['/api/lab-studies'],
  })

  const createParameterMutation = useMutation({
    mutationFn: async (data: LabParameterFormData) => {
      return apiRequest('POST', '/api/lab-parameters', data)
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/lab-parameters'] })
      toast({
        title: "Успешно!",
        description: "Параметр исследования создан",
      })
      form.reset()
      setOpen(false)
    },
    onError: (error: any) => {
      console.error("Error creating lab parameter:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось создать параметр исследования",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: LabParameterFormData) => {
    // Convert numeric strings to numbers
    const processedData = {
      ...data,
      sortOrder: Number(data.sortOrder) || 0,
      referenceMin: data.referenceMin ? Number(data.referenceMin) : undefined,
      referenceMax: data.referenceMax ? Number(data.referenceMax) : undefined,
    }
    createParameterMutation.mutate(processedData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" data-testid="button-add-parameter">
            <Plus className="h-4 w-4 mr-2" />
            Добавить параметр
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-parameter">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings2 className="h-5 w-5 mr-2 text-primary" />
            Новый параметр исследования
          </DialogTitle>
          <DialogDescription>
            Добавьте параметр для лабораторного исследования
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="studyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Лабораторное исследование *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={!!studyId} // Disable if pre-selected
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-parameter-study">
                        <SelectValue placeholder="Выберите исследование" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(labStudies as any[]).filter((s: any) => s.isActive !== false).map((study: any) => (
                        <SelectItem key={study.id} value={study.id}>
                          {study.name}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название параметра *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Например: Гемоглобин" 
                      {...field} 
                      data-testid="input-parameter-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Единица измерения</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="г/л, мкмоль/л, %" 
                        {...field} 
                        data-testid="input-parameter-unit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип данных</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-parameter-datatype">
                          <SelectValue placeholder="Тип" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="numeric">Числовой</SelectItem>
                        <SelectItem value="text">Текстовый</SelectItem>
                        <SelectItem value="boolean">Да/Нет</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("dataType") === "numeric" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="referenceMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Мин. норма</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          data-testid="input-reference-min"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referenceMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Макс. норма</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="100"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          data-testid="input-reference-max"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="species"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Вид животного</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="собака, кошка"
                          {...field} 
                          data-testid="input-parameter-species"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Дополнительная информация о параметре..."
                      className="resize-none"
                      rows={2}
                      {...field} 
                      data-testid="textarea-parameter-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Порядок сортировки</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        data-testid="input-sort-order"
                      />
                    </FormControl>
                    <FormDescription>
                      Порядок отображения в результатах
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isRequired"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Обязательный параметр</FormLabel>
                      <FormDescription>
                        Требует обязательного заполнения
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-parameter-required"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel-parameter"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={createParameterMutation.isPending}
                data-testid="button-save-parameter"
              >
                {createParameterMutation.isPending ? "Создание..." : "Создать параметр"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}