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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Edit, Trash2, FileText, Eye, Code } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table as TiptapTable } from '@tiptap/extension-table'
import { TableRow as TiptapTableRow } from '@tiptap/extension-table-row'
import { TableCell as TiptapTableCell } from '@tiptap/extension-table-cell'
import { TableHeader as TiptapTableHeader } from '@tiptap/extension-table-header'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'

// Validation schema
const templateSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  type: z.enum([
    'invoice', 
    'encounter_summary', 
    'prescription', 
    'vaccination_certificate', 
    'lab_results_report', 
    'informed_consent_surgery', 
    'informed_consent_anesthesia',
    'informed_consent_general',
    'service_agreement',
    'hospitalization_agreement'
  ]),
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
  informed_consent_anesthesia: 'Согласие на анестезию',
  informed_consent_general: 'Информированное согласие',
  service_agreement: 'Договор на ветеринарное обслуживание',
  hospitalization_agreement: 'Договор на стационарное лечение'
}

// Tiptap Toolbar Component
function TiptapToolbar({ editor }: { editor: any }) {
  if (!editor) return null

  return (
    <div className="border border-input rounded-t-md bg-background p-2 flex flex-wrap gap-1">
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('bold') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleBold().run()}
        data-testid="button-bold"
      >
        <strong>B</strong>
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('italic') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        data-testid="button-italic"
      >
        <em>I</em>
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('underline') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        data-testid="button-underline"
      >
        <u>U</u>
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        type="button"
        size="sm"
        variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        data-testid="button-align-left"
      >
        ←
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        data-testid="button-align-center"
      >
        ↔
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        data-testid="button-align-right"
      >
        →
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('bulletList') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        data-testid="button-bullet-list"
      >
        • Список
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('orderedList') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        data-testid="button-ordered-list"
      >
        1. Нумерация
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        data-testid="button-insert-table"
      >
        📊 Таблица
      </Button>
      {editor.isActive('table') && (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            data-testid="button-add-column"
          >
            + Колонка
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            data-testid="button-add-row"
          >
            + Строка
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => editor.chain().focus().deleteTable().run()}
            data-testid="button-delete-table"
          >
            🗑 Удалить
          </Button>
        </>
      )}
    </div>
  )
}

// Tiptap Editor Component
function TiptapEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TiptapTable.configure({
        resizable: true,
      }),
      TiptapTableRow,
      TiptapTableHeader,
      TiptapTableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  return (
    <div className="border border-input rounded-md">
      <TiptapToolbar editor={editor} />
      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none"
        data-testid="wysiwyg-editor"
      />
    </div>
  )
}

function TemplateDialog({ template, onSuccess }: { template?: DocumentTemplate; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'code'>('wysiwyg')
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
                        <SelectItem key={value} value={value} data-testid={`select-item-template-type-${value}`}>{label}</SelectItem>
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
                  <FormLabel>Содержимое шаблона</FormLabel>
                  <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as 'wysiwyg' | 'code')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="wysiwyg" data-testid="tab-wysiwyg-editor">
                        <Eye className="h-4 w-4 mr-2" />
                        Визуальный редактор
                      </TabsTrigger>
                      <TabsTrigger value="code" data-testid="tab-code-editor">
                        <Code className="h-4 w-4 mr-2" />
                        HTML код
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="wysiwyg" className="mt-4">
                      <FormControl>
                        <TiptapEditor 
                          content={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </TabsContent>
                    <TabsContent value="code" className="mt-4">
                      <FormControl>
                        <Textarea 
                          placeholder="<!DOCTYPE html>..." 
                          className="text-sm min-h-[400px] font-sans"
                          {...field} 
                          data-testid="textarea-template-content"
                        />
                      </FormControl>
                    </TabsContent>
                  </Tabs>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground mt-2">
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-template">
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-template">
                {template ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function PreviewDialog({ template }: { template: DocumentTemplate }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'html' | 'rendered'>('rendered')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-preview-template-${template.id}`}>
          <Eye className="h-3 w-3 mr-1" />
          Просмотр
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Просмотр шаблона: {template.name}</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'html' | 'rendered')} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="html" data-testid="tab-html-preview">
              <Code className="h-4 w-4 mr-2" />
              HTML код
            </TabsTrigger>
            <TabsTrigger value="rendered" data-testid="tab-rendered-preview">
              <Eye className="h-4 w-4 mr-2" />
              Предпросмотр
            </TabsTrigger>
          </TabsList>
          <TabsContent value="html" className="h-[60vh] overflow-auto">
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-sm whitespace-pre-wrap font-sans" data-testid="preview-html-content">
                {template.content}
              </pre>
            </div>
          </TabsContent>
          <TabsContent value="rendered" className="h-[60vh] overflow-auto border rounded-lg bg-white">
            <iframe
              srcDoc={template.content}
              className="w-full h-full"
              title="Template Preview"
              sandbox="allow-same-origin"
              data-testid="preview-iframe"
            />
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-close-preview">
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function DocumentTemplates() {
  const { toast } = useToast()

  const { data: allTemplates = [], isLoading } = useQuery<DocumentTemplate[]>({
    queryKey: ['/api/document-templates']
  })

  // Фильтруем только шаблоны клиники (скрываем системные)
  const templates = allTemplates.filter(t => t.tenantId !== null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/document-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] })
      toast({ title: "Шаблон сброшен к системному" })
    },
    onError: () => {
      toast({ title: "Ошибка сброса шаблона", variant: "destructive" })
    }
  })

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите сбросить этот шаблон к системному? Все изменения будут потеряны.')) {
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
            <div className="p-8 text-center text-muted-foreground" data-testid="text-loading-templates">Загрузка...</div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground" data-testid="text-empty-templates">
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
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                    <TableCell className="font-medium" data-testid={`text-template-name-${template.id}`}>{template.name}</TableCell>
                    <TableCell data-testid={`text-template-type-${template.id}`}>{templateTypeNames[template.type] || template.type}</TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? "default" : "secondary"} data-testid={`badge-template-status-${template.id}`}>
                        {template.isActive ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-template-date-${template.id}`}>{new Date(template.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end" data-testid={`actions-template-${template.id}`}>
                        <PreviewDialog template={template} />
                        <TemplateDialog template={template} onSuccess={() => {}} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(template.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-reset-template-${template.id}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Сбросить
                        </Button>
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
