import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  TestTube, 
  Usb, 
  Wifi,
  WifiOff,
  Cable,
  Upload,
  RefreshCw,
  Settings,
  FlaskConical,
  Activity
} from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

interface ExternalLabIntegration {
  id: string
  tenantId: string
  branchId: string
  labType: string
  name: string
  apiUrl: string | null
  apiKey: string | null
  apiSecret: string | null
  hasCredentials: boolean
  isEnabled: boolean
  autoImport: boolean
  importSchedule: string | null
  testMapping: Record<string, string> | null
  lastSyncAt: Date | null
  lastSyncStatus: string | null
  lastSyncError: string | null
  createdAt: Date
  updatedAt: Date
}

interface LabAnalyzer {
  id: string
  tenantId: string
  branchId: string
  name: string
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  connectionType: string
  comPort: string | null
  baudRate: number | null
  tcpHost: string | null
  tcpPort: number | null
  protocol: string
  isEnabled: boolean
  status: string
  lastHeartbeat: Date | null
  lastError: string | null
  createdAt: Date
  updatedAt: Date
}

interface LabResultImport {
  id: string
  tenantId: string
  branchId: string
  sourceType: string
  sourceId: string | null
  sourceName: string | null
  fileName: string | null
  rawData: string | null
  parsedResults: Record<string, any>[] | null
  status: string
  errorMessage: string | null
  importedBy: string | null
  patientId: string | null
  encounterId: string | null
  createdAt: Date
  updatedAt: Date
}

const externalLabSchema = z.object({
  labType: z.string().min(1, "Тип лаборатории обязателен"),
  name: z.string().min(1, "Название обязательно"),
  branchId: z.string().uuid("Выберите отделение"),
  apiUrl: z.string().url("Введите корректный URL").optional().or(z.literal("")),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  isEnabled: z.boolean().default(true),
  autoImport: z.boolean().default(false),
  importSchedule: z.string().optional(),
})

const labAnalyzerSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  branchId: z.string().uuid("Выберите отделение"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  connectionType: z.enum(["serial", "tcp"]),
  comPort: z.string().optional(),
  baudRate: z.coerce.number().optional(),
  tcpHost: z.string().optional(),
  tcpPort: z.coerce.number().optional(),
  protocol: z.enum(["astm", "lis2-a2", "hl7"]).default("astm"),
  isEnabled: z.boolean().default(true),
})

type ExternalLabFormData = z.infer<typeof externalLabSchema>
type LabAnalyzerFormData = z.infer<typeof labAnalyzerSchema>

const LAB_TYPES = [
  { value: "vet_union", label: "Vet Union (Инвитро Вет)" },
  { value: "shans_bio", label: "Шанс Био" },
  { value: "idexx", label: "IDEXX" },
  { value: "zoogen", label: "Зооген" },
  { value: "other", label: "Другая лаборатория" },
]

const PROTOCOLS = [
  { value: "astm", label: "ASTM E1381/E1394" },
  { value: "lis2-a2", label: "LIS2-A2" },
  { value: "hl7", label: "HL7 v2.x" },
]

function ExternalLabsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLab, setEditingLab] = useState<ExternalLabIntegration | null>(null)
  const { toast } = useToast()

  const form = useForm<ExternalLabFormData>({
    resolver: zodResolver(externalLabSchema),
    defaultValues: {
      labType: "",
      name: "",
      branchId: "",
      apiUrl: "",
      apiKey: "",
      apiSecret: "",
      isEnabled: true,
      autoImport: false,
      importSchedule: "",
    },
  })

  const { data: integrations, isLoading } = useQuery<ExternalLabIntegration[]>({
    queryKey: ['/api/lab-integrations/external'],
  })

  const { data: branches } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['/api/branches'],
  })

  const createMutation = useMutation({
    mutationFn: (data: ExternalLabFormData) =>
      apiRequest('POST', '/api/lab-integrations/external', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lab-integrations/external'] })
      toast({ title: "Интеграция добавлена" })
      setIsDialogOpen(false)
      form.reset()
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExternalLabFormData> }) =>
      apiRequest('PUT', `/api/lab-integrations/external/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lab-integrations/external'] })
      toast({ title: "Интеграция обновлена" })
      setIsDialogOpen(false)
      setEditingLab(null)
      form.reset()
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('DELETE', `/api/lab-integrations/external/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lab-integrations/external'] })
      toast({ title: "Интеграция удалена" })
    },
    onError: (error: any) => {
      toast({ title: "Ошибка удаления", description: error.message, variant: "destructive" })
    },
  })

  const handleEdit = (lab: ExternalLabIntegration) => {
    setEditingLab(lab)
    form.reset({
      labType: lab.labType,
      name: lab.name,
      branchId: lab.branchId,
      apiUrl: lab.apiUrl || "",
      apiKey: "", // Don't populate masked credentials - user must re-enter to update
      apiSecret: "", // Don't populate masked credentials
      isEnabled: lab.isEnabled,
      autoImport: lab.autoImport,
      importSchedule: lab.importSchedule || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Удалить интеграцию с лабораторией?")) {
      deleteMutation.mutate(id)
    }
  }

  const onSubmit = (data: ExternalLabFormData) => {
    if (editingLab) {
      // When editing, omit empty credential fields to preserve existing values
      const updateData = { ...data };
      if (!updateData.apiKey || updateData.apiKey.trim() === '') {
        delete (updateData as any).apiKey;
      }
      if (!updateData.apiSecret || updateData.apiSecret.trim() === '') {
        delete (updateData as any).apiSecret;
      }
      updateMutation.mutate({ id: editingLab.id, data: updateData })
    } else {
      createMutation.mutate(data)
    }
  }

  const getStatusBadge = (lab: ExternalLabIntegration) => {
    if (!lab.isEnabled) {
      return <Badge variant="secondary">Отключено</Badge>
    }
    if (lab.lastSyncStatus === "success") {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Активно</Badge>
    }
    if (lab.lastSyncStatus === "error") {
      return <Badge variant="destructive">Ошибка</Badge>
    }
    return <Badge variant="outline">Ожидание</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Внешние лаборатории</h3>
          <p className="text-sm text-muted-foreground">
            Настройте интеграцию с лабораториями для автоматического получения результатов анализов
          </p>
        </div>
        <Button onClick={() => { setEditingLab(null); form.reset(); setIsDialogOpen(true) }} data-testid="button-add-lab">
          <Plus className="h-4 w-4 mr-2" />
          Добавить лабораторию
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
          ) : !integrations?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет настроенных интеграций с лабораториями</p>
              <p className="text-sm mt-2">Добавьте интеграцию для автоматического получения результатов анализов</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Лаборатория</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Отделение</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Последняя синхронизация</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map((lab) => (
                  <TableRow key={lab.id} data-testid={`row-lab-${lab.id}`}>
                    <TableCell className="font-medium">{lab.name}</TableCell>
                    <TableCell>{LAB_TYPES.find(t => t.value === lab.labType)?.label || lab.labType}</TableCell>
                    <TableCell>{branches?.find(b => b.id === lab.branchId)?.name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(lab)}</TableCell>
                    <TableCell>
                      {lab.lastSyncAt 
                        ? format(new Date(lab.lastSyncAt), "dd.MM.yyyy HH:mm", { locale: ru })
                        : "Не синхронизировано"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(lab)} data-testid={`button-edit-lab-${lab.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(lab.id)} data-testid={`button-delete-lab-${lab.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Ручной импорт результатов
          </CardTitle>
          <CardDescription>
            Загрузите файл с результатами анализов, если автоматическая интеграция недоступна
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input type="file" accept=".csv,.xlsx,.xml,.hl7" className="max-w-sm" data-testid="input-file-import" />
            <Button variant="outline" data-testid="button-upload-results">
              <Upload className="h-4 w-4 mr-2" />
              Загрузить
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Поддерживаемые форматы: CSV, Excel (XLSX), XML, HL7
          </p>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLab ? "Редактировать интеграцию" : "Добавить лабораторию"}</DialogTitle>
            <DialogDescription>
              Настройте подключение к внешней лаборатории для автоматического получения результатов
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="labType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип лаборатории</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lab-type">
                            <SelectValue placeholder="Выберите лабораторию" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LAB_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
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
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Например: Vet Union - Москва" data-testid="input-lab-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Отделение</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lab-branch">
                          <SelectValue placeholder="Выберите отделение" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches?.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="apiUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://api.vetunion.ru/v1" data-testid="input-lab-api-url" />
                      </FormControl>
                      <FormDescription>URL API лаборатории (если доступен)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder={editingLab ? "Оставьте пустым чтобы сохранить текущий" : "Ключ API"} data-testid="input-lab-api-key" />
                      </FormControl>
                      {editingLab?.hasCredentials && (
                        <FormDescription>Учётные данные сохранены. Введите новые значения для замены.</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apiSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Secret</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder={editingLab ? "Оставьте пустым чтобы сохранить текущий" : "Секрет API"} data-testid="input-lab-api-secret" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-lab-enabled" />
                      </FormControl>
                      <FormLabel className="!mt-0">Интеграция активна</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="autoImport"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-lab-auto-import" />
                      </FormControl>
                      <FormLabel className="!mt-0">Авто-импорт результатов</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" data-testid="button-save-lab">
                  {editingLab ? "Сохранить" : "Добавить"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AnalyzersTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAnalyzer, setEditingAnalyzer] = useState<LabAnalyzer | null>(null)
  const { toast } = useToast()

  const form = useForm<LabAnalyzerFormData>({
    resolver: zodResolver(labAnalyzerSchema),
    defaultValues: {
      name: "",
      branchId: "",
      manufacturer: "",
      model: "",
      serialNumber: "",
      connectionType: "serial",
      comPort: "",
      baudRate: 9600,
      tcpHost: "",
      tcpPort: 4001,
      protocol: "astm",
      isEnabled: true,
    },
  })

  const connectionType = form.watch("connectionType")

  const { data: analyzers, isLoading } = useQuery<LabAnalyzer[]>({
    queryKey: ['/api/lab-integrations/analyzers'],
  })

  const { data: branches } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['/api/branches'],
  })

  const createMutation = useMutation({
    mutationFn: (data: LabAnalyzerFormData) =>
      apiRequest('POST', '/api/lab-integrations/analyzers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lab-integrations/analyzers'] })
      toast({ title: "Анализатор добавлен" })
      setIsDialogOpen(false)
      form.reset()
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LabAnalyzerFormData> }) =>
      apiRequest('PUT', `/api/lab-integrations/analyzers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lab-integrations/analyzers'] })
      toast({ title: "Анализатор обновлён" })
      setIsDialogOpen(false)
      setEditingAnalyzer(null)
      form.reset()
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('DELETE', `/api/lab-integrations/analyzers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lab-integrations/analyzers'] })
      toast({ title: "Анализатор удалён" })
    },
    onError: (error: any) => {
      toast({ title: "Ошибка удаления", description: error.message, variant: "destructive" })
    },
  })

  const handleEdit = (analyzer: LabAnalyzer) => {
    setEditingAnalyzer(analyzer)
    form.reset({
      name: analyzer.name,
      branchId: analyzer.branchId,
      manufacturer: analyzer.manufacturer || "",
      model: analyzer.model || "",
      serialNumber: analyzer.serialNumber || "",
      connectionType: analyzer.connectionType as "serial" | "tcp",
      comPort: analyzer.comPort || "",
      baudRate: analyzer.baudRate || 9600,
      tcpHost: analyzer.tcpHost || "",
      tcpPort: analyzer.tcpPort || 4001,
      protocol: analyzer.protocol as "astm" | "lis2-a2" | "hl7",
      isEnabled: analyzer.isEnabled,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Удалить анализатор?")) {
      deleteMutation.mutate(id)
    }
  }

  const onSubmit = (data: LabAnalyzerFormData) => {
    if (editingAnalyzer) {
      updateMutation.mutate({ id: editingAnalyzer.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const getStatusBadge = (analyzer: LabAnalyzer) => {
    if (!analyzer.isEnabled) {
      return <Badge variant="secondary">Отключён</Badge>
    }
    switch (analyzer.status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <Wifi className="h-3 w-3 mr-1" />
          Подключён
        </Badge>
      case "error":
        return <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Ошибка
        </Badge>
      case "disconnected":
        return <Badge variant="outline">
          <WifiOff className="h-3 w-3 mr-1" />
          Отключён
        </Badge>
      default:
        return <Badge variant="outline">Ожидание</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Лабораторные анализаторы</h3>
          <p className="text-sm text-muted-foreground">
            Подключите анализаторы крови и мочи для автоматической передачи результатов
          </p>
        </div>
        <Button onClick={() => { setEditingAnalyzer(null); form.reset(); setIsDialogOpen(true) }} data-testid="button-add-analyzer">
          <Plus className="h-4 w-4 mr-2" />
          Добавить анализатор
        </Button>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">Протокол ASTM/LIS2-A2</p>
              <p className="text-blue-700 dark:text-blue-300">
                Поддерживается подключение анализаторов через COM-порт (RS-232) или TCP/IP. 
                Для работы необходим ASTM-коннектор на компьютере рядом с анализатором.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
          ) : !analyzers?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет подключённых анализаторов</p>
              <p className="text-sm mt-2">Добавьте анализатор для автоматического получения результатов</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Анализатор</TableHead>
                  <TableHead>Производитель / Модель</TableHead>
                  <TableHead>Подключение</TableHead>
                  <TableHead>Протокол</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyzers.map((analyzer) => (
                  <TableRow key={analyzer.id} data-testid={`row-analyzer-${analyzer.id}`}>
                    <TableCell className="font-medium">{analyzer.name}</TableCell>
                    <TableCell>
                      {analyzer.manufacturer || analyzer.model 
                        ? `${analyzer.manufacturer || ""} ${analyzer.model || ""}`.trim()
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      {analyzer.connectionType === "serial" ? (
                        <span className="flex items-center gap-1">
                          <Usb className="h-4 w-4" />
                          {analyzer.comPort || "COM"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Cable className="h-4 w-4" />
                          {analyzer.tcpHost}:{analyzer.tcpPort}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {PROTOCOLS.find(p => p.value === analyzer.protocol)?.label || analyzer.protocol}
                    </TableCell>
                    <TableCell>{getStatusBadge(analyzer)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(analyzer)} data-testid={`button-edit-analyzer-${analyzer.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(analyzer.id)} data-testid={`button-delete-analyzer-${analyzer.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAnalyzer ? "Редактировать анализатор" : "Добавить анализатор"}</DialogTitle>
            <DialogDescription>
              Настройте подключение к лабораторному анализатору
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Например: Гематологический №1" data-testid="input-analyzer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Отделение</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-analyzer-branch">
                            <SelectValue placeholder="Выберите отделение" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches?.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Производитель</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Mindray, Sysmex..." data-testid="input-analyzer-manufacturer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Модель</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="BC-30s, XN-1000..." data-testid="input-analyzer-model" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Серийный номер</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="S/N" data-testid="input-analyzer-serial" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="protocol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Протокол обмена</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-analyzer-protocol">
                          <SelectValue placeholder="Выберите протокол" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROTOCOLS.map((protocol) => (
                          <SelectItem key={protocol.value} value={protocol.value}>{protocol.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>ASTM - стандартный протокол для большинства анализаторов</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="connectionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип подключения</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-connection-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="serial">
                          <span className="flex items-center gap-2">
                            <Usb className="h-4 w-4" />
                            COM-порт (RS-232)
                          </span>
                        </SelectItem>
                        <SelectItem value="tcp">
                          <span className="flex items-center gap-2">
                            <Cable className="h-4 w-4" />
                            TCP/IP (Ethernet)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {connectionType === "serial" ? (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="comPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>COM-порт</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="COM3" data-testid="input-com-port" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="baudRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Скорость (baud)</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}>
                          <FormControl>
                            <SelectTrigger data-testid="select-baud-rate">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="2400">2400</SelectItem>
                            <SelectItem value="4800">4800</SelectItem>
                            <SelectItem value="9600">9600</SelectItem>
                            <SelectItem value="19200">19200</SelectItem>
                            <SelectItem value="38400">38400</SelectItem>
                            <SelectItem value="57600">57600</SelectItem>
                            <SelectItem value="115200">115200</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tcpHost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IP-адрес</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="192.168.1.100" data-testid="input-tcp-host" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tcpPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TCP-порт</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="4001" data-testid="input-tcp-port" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="isEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-analyzer-enabled" />
                    </FormControl>
                    <FormLabel className="!mt-0">Анализатор активен</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" data-testid="button-save-analyzer">
                  {editingAnalyzer ? "Сохранить" : "Добавить"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LabIntegrationsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" data-testid="text-lab-integrations-title">Лабораторные интеграции</h2>
        <p className="text-muted-foreground">
          Настройка подключений к внешним лабораториям и лабораторному оборудованию
        </p>
      </div>

      <Tabs defaultValue="external-labs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="external-labs" data-testid="tab-external-labs">
            <FlaskConical className="h-4 w-4 mr-2" />
            Внешние лаборатории
          </TabsTrigger>
          <TabsTrigger value="analyzers" data-testid="tab-analyzers">
            <TestTube className="h-4 w-4 mr-2" />
            Анализаторы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="external-labs">
          <ExternalLabsTab />
        </TabsContent>

        <TabsContent value="analyzers">
          <AnalyzersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
