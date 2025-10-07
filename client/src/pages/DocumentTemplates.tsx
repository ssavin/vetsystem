import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Edit, Trash2, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"

// Validation schema
const templateSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  type: z.enum(['invoice', 'encounter_summary', 'prescription', 'vaccination_certificate', 'lab_results_report', 'informed_consent_surgery', 'informed_consent_anesthesia']),
  content: z.string().min(1, "Содержимое шаблона обязательно"),
  isActive: z.boolean().default(true)
})

type TemplateFormData = z.infer<typeof templateSchema>

interface DocumentTemplate {
  id: string
  tenantId: string | null
  name: string
  type: string
  content: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const templateTypeNames: Record<string, string> = {
  invoice: 'Счет-фактура',
  encounter_summary: 'Протокол приема',
  prescription: 'Рецепт',
  vaccination_certificate: 'Сертификат вакцинации',
  lab_results_report: 'Результаты анализов',
  informed_consent_surgery: 'Согласие на операцию',
  informed_consent_anesthesia: 'Согласие на анестезию'
}

function TemplateDialog({ template, onSuccess }: { template?: DocumentTemplate; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: template ? {
      name: template.name,
      type: template.type as any,
      content: template.content,
      isActive: template.isActive
    } : {
      name: '',
      type: 'encounter_summary',
      content: '',
      isActive: true
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: TemplateFormData) => apiRequest('POST', '/api/document-templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] })
      toast({ title: "Шаблон создан успешно" })
      setOpen(false)
      form.reset()
      onSuccess()
    },
    onError: () => {
      toast({ title: "Ошибка создания шаблона", variant: "destructive" })
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: TemplateFormData) => apiRequest('PUT', `/api/document-templates/${template?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] })
      toast({ title: "Шаблон обновлен успешно" })
      setOpen(false)
      onSuccess()
    },
    onError: () => {
      toast({ title: "Ошибка обновления шаблона", variant: "destructive" })
    }
  })

  const onSubmit = (data: TemplateFormData) => {
    if (template) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {template ? (
          <Button size="sm" variant="outline" data-testid={`button-edit-template-${template.id}`}>
            <Edit className="h-3 w-3 mr-1" />
            Редактировать
          </Button>
        ) : (
          <Button data-testid="button-create-template">
            <Plus className="h-4 w-4 mr-2" />
            Создать шаблон
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Редактировать шаблон' : 'Создать новый шаблон'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Название шаблона" {...field} data-testid="input-template-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип документа</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-template-type">
                        <SelectValue placeholder="Выберите тип документа" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(templateTypeNames).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTML Шаблон (Handlebars)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="<!DOCTYPE html>..." 
                      className="font-mono text-sm min-h-[300px]"
                      {...field} 
                      data-testid="textarea-template-content"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Используйте синтаксис Handlebars: {`{{variable}}`}, {`{{#each items}}`}...{`{{/each}}`}
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Активен</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Шаблон будет доступен для использования
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-template-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {template ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default function DocumentTemplates() {
  const { toast } = useToast()

  const { data: templates = [], isLoading } = useQuery<DocumentTemplate[]>({
    queryKey: ['/api/document-templates']
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/document-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] })
      toast({ title: "Шаблон удален успешно" })
    },
    onError: () => {
      toast({ title: "Ошибка удаления шаблона", variant: "destructive" })
    }
  })

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот шаблон?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-document-templates-title">Шаблоны документов</h1>
          <p className="text-muted-foreground">Управление шаблонами для печати документов</p>
        </div>
        <TemplateDialog onSuccess={() => {}} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все шаблоны</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Шаблоны не найдены</p>
              <p className="text-sm mt-2">Создайте первый шаблон для печати документов</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип документа</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Область</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{templateTypeNames[template.type] || template.type}</TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.tenantId ? "outline" : "secondary"}>
                        {template.tenantId ? 'Клиника' : 'Система'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(template.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <TemplateDialog template={template} onSuccess={() => {}} />
                        {template.tenantId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(template.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Удалить
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
