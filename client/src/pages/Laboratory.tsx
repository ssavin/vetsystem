import { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Microscope,
  ClipboardList,
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Printer,
  User,
  ArrowRight,
  AlertTriangle,
  X,
  Edit,
} from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"


const ORDER_STATUSES = [
  { value: "pending", label: "Ожидает", color: "secondary" as const },
  { value: "sample_taken", label: "Забор взят", color: "default" as const },
  { value: "in_progress", label: "В работе", color: "default" as const },
  { value: "completed", label: "Готов", color: "default" as const },
  { value: "cancelled", label: "Отменён", color: "destructive" as const },
]

const NEXT_STATUS: Record<string, string> = {
  pending: "sample_taken",
  sample_taken: "in_progress",
  in_progress: "completed",
}

const NEXT_STATUS_LABELS: Record<string, string> = {
  pending: "Забор взят",
  sample_taken: "В работу",
  in_progress: "Завершить",
}

const URGENCY_LABELS: Record<string, string> = {
  routine: "Плановый",
  urgent: "Срочный",
  stat: "Немедленно",
}

const URGENCY_BADGE_VARIANT: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  routine: "outline",
  urgent: "secondary",
  stat: "destructive",
}

const RESULT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  normal: { label: "Норма", className: "text-green-700 dark:text-green-400" },
  low: { label: "Понижен", className: "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  high: { label: "Повышен", className: "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  critical_low: { label: "Крит. низкий", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold" },
  critical_high: { label: "Крит. высокий", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold" },
}


function getStatusConfig(status: string) {
  return ORDER_STATUSES.find((s) => s.value === status) ?? ORDER_STATUSES[0]
}


const createOrderSchema = z.object({
  patientId: z.string().min(1, "Пациент обязателен"),
  doctorId: z.string().min(1, "Врач обязателен"),
  studyId: z.string().min(1, "Исследование обязательно"),
  urgency: z.string().default("routine"),
  notes: z.string().optional(),
})

type CreateOrderData = z.infer<typeof createOrderSchema>

const resultEntrySchema = z.object({
  numericValue: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(Number(v)), { message: "Должно быть числом" }),
  value: z.string().optional(),
  status: z.string().default("normal"),
  notes: z.string().optional(),
})

type ResultEntryData = z.infer<typeof resultEntrySchema>


interface CreateOrderDialogProps {
  open: boolean
  onClose: () => void
  prefillPatientId?: string
  prefillMedicalRecordId?: string
}

function CreateOrderDialog({ open, onClose, prefillPatientId, prefillMedicalRecordId }: CreateOrderDialogProps) {
  const { toast } = useToast()

  const form = useForm<CreateOrderData>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      patientId: prefillPatientId ?? "",
      doctorId: "",
      studyId: "",
      urgency: "routine",
      notes: "",
    },
  })

  const { data: patients = [] } = useQuery({ queryKey: ["/api/patients"] })
  const { data: doctors = [] } = useQuery({ queryKey: ["/api/doctors"] })
  const { data: labStudies = [] } = useQuery({ queryKey: ["/api/lab-studies"] })

  const activeStudies = useMemo(
    () => (labStudies as any[]).filter((s: any) => s.isActive !== false),
    [labStudies]
  )

  const createMutation = useMutation({
    mutationFn: async (data: CreateOrderData) => {
      const payload: any = {
        ...data,
        orderedDate: new Date().toISOString(),
        ...(prefillMedicalRecordId ? { medicalRecordId: prefillMedicalRecordId } : {}),
      }
      const res = await apiRequest("POST", "/api/lab-orders", payload)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Ошибка создания заказа")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-orders"] })
      toast({ title: "Заказ создан" })
      form.reset()
      onClose()
    },
    onError: (e: Error) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" })
    },
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Новый лабораторный заказ
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пациент *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите пациента" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(patients as any[]).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
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
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите врача" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(doctors as any[]).map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
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
              name="studyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Исследование *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите исследование" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeStudies.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div>
                            <div className="font-medium">{s.name}</div>
                            {s.sampleType && (
                              <div className="text-xs text-muted-foreground">{s.sampleType}</div>
                            )}
                          </div>
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
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Срочность</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="routine">Плановый</SelectItem>
                      <SelectItem value="urgent">Срочный</SelectItem>
                      <SelectItem value="stat">Немедленно</SelectItem>
                    </SelectContent>
                  </Select>
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
                      placeholder="Клинические данные, симптомы..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Создание..." : "Создать заказ"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}


interface OrderDetailDialogProps {
  orderId: string | null
  onClose: () => void
}

function OrderDetailDialog({ orderId, onClose }: OrderDetailDialogProps) {
  const { toast } = useToast()
  const [editingResultId, setEditingResultId] = useState<string | null>(null)

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["/api/lab-orders", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/lab-orders/${orderId}`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch order")
      return res.json()
    },
    enabled: !!orderId,
  })

  const { data: resultDetails = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/lab-result-details", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/lab-result-details?orderId=${orderId}`, { credentials: "include" })
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!orderId,
  })

  const { data: parameters = [] } = useQuery({
    queryKey: ["/api/lab-parameters", order?.studyId],
    queryFn: async () => {
      const res = await fetch(`/api/lab-parameters?studyId=${order.studyId}`, { credentials: "include" })
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!order?.studyId,
  })

  const { data: patients = [] } = useQuery({ queryKey: ["/api/patients"] })
  const { data: doctors = [] } = useQuery({ queryKey: ["/api/doctors"] })
  const { data: labStudies = [] } = useQuery({ queryKey: ["/api/lab-studies"] })

  const patientMap = useMemo(() => {
    const m: Record<string, any> = {}
    ;(patients as any[]).forEach((p: any) => { m[p.id] = p })
    return m
  }, [patients])

  const doctorMap = useMemo(() => {
    const m: Record<string, any> = {}
    ;(doctors as any[]).forEach((d: any) => { m[d.id] = d })
    return m
  }, [doctors])

  const studyMap = useMemo(() => {
    const m: Record<string, any> = {}
    ;(labStudies as any[]).forEach((s: any) => { m[s.id] = s })
    return m
  }, [labStudies])

  const resultMap = useMemo(() => {
    const m: Record<string, any> = {}
    ;(resultDetails as any[]).forEach((r: any) => { m[r.parameterId] = r })
    return m
  }, [resultDetails])

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const payload: any = { status: newStatus }
      if (newStatus === "sample_taken") payload.sampleTakenDate = new Date().toISOString()
      if (newStatus === "completed") payload.completedDate = new Date().toISOString()
      const res = await apiRequest("PUT", `/api/lab-orders/${orderId}`, payload)
      if (!res.ok) throw new Error("Failed to update status")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-orders"] })
      queryClient.invalidateQueries({ queryKey: ["/api/lab-orders", orderId] })
      toast({ title: "Статус обновлён" })
    },
    onError: () => {
      toast({ title: "Ошибка обновления статуса", variant: "destructive" })
    },
  })

  const saveResultMutation = useMutation({
    mutationFn: async ({ parameterId, data, existingId }: { parameterId: string; data: ResultEntryData; existingId?: string }) => {
      const payload = {
        orderId,
        parameterId,
        numericValue: data.numericValue ? Number(data.numericValue) : undefined,
        value: data.value || undefined,
        status: data.status,
        notes: data.notes,
        reportedDate: new Date().toISOString(),
      }
      if (existingId) {
        const res = await apiRequest("PUT", `/api/lab-result-details/${existingId}`, payload)
        if (!res.ok) throw new Error("Failed to save result")
        return res.json()
      } else {
        const res = await apiRequest("POST", "/api/lab-result-details", payload)
        if (!res.ok) throw new Error("Failed to save result")
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-result-details", orderId] })
      setEditingResultId(null)
      toast({ title: "Результат сохранён" })
    },
    onError: () => {
      toast({ title: "Ошибка сохранения результата", variant: "destructive" })
    },
  })

  if (!orderId) return null

  const patient = order ? patientMap[order.patientId] : null
  const doctor = order ? doctorMap[order.doctorId] : null
  const study = order ? studyMap[order.studyId] : null
  const statusConfig = order ? getStatusConfig(order.status) : null
  const nextStatus = order?.status ? NEXT_STATUS[order.status] : null
  const nextLabel = order?.status ? NEXT_STATUS_LABELS[order.status] : null

  return (
    <Dialog open={!!orderId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        {orderLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : order ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                <span>Заказ {order.orderNumber}</span>
                {statusConfig && (
                  <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
                )}
                {order.urgency && order.urgency !== "routine" && (
                  <Badge variant={URGENCY_BADGE_VARIANT[order.urgency] ?? "outline"}>
                    {URGENCY_LABELS[order.urgency] ?? order.urgency}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm border rounded-md p-3 bg-muted/30">
              <div>
                <div className="text-muted-foreground text-xs">Пациент</div>
                <div className="font-medium">{patient?.name ?? "—"}</div>
                {patient?.species && (
                  <div className="text-xs text-muted-foreground">{patient.species}{patient.breed ? ` · ${patient.breed}` : ""}</div>
                )}
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Врач</div>
                <div className="font-medium">{doctor?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Исследование</div>
                <div className="font-medium">{study?.name ?? "—"}</div>
                {study?.sampleType && <div className="text-xs text-muted-foreground">Материал: {study.sampleType}</div>}
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Дата назначения</div>
                <div className="font-medium">
                  {order.orderedDate ? format(new Date(order.orderedDate), "dd.MM.yyyy", { locale: ru }) : "—"}
                </div>
              </div>
              {order.notes && (
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs">Примечания</div>
                  <div className="text-sm">{order.notes}</div>
                </div>
              )}
            </div>

            {/* Status flow */}
            {order.status !== "completed" && order.status !== "cancelled" && nextStatus && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatusMutation.mutate(nextStatus)}
                  disabled={updateStatusMutation.isPending}
                  className="gap-1"
                >
                  <ArrowRight className="h-3 w-3" />
                  {nextLabel}
                </Button>
              </div>
            )}

            {/* Results table */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Параметры и результаты</h3>
              {(parameters as any[]).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Параметры исследования не заданы. Добавьте их в справочнике.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Параметр</TableHead>
                      <TableHead>Ед.</TableHead>
                      <TableHead>Значение</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(parameters as any[]).map((param: any) => {
                      const existing = resultMap[param.id]
                      const isEditing = editingResultId === param.id
                      const statusCfg = existing ? RESULT_STATUS_CONFIG[existing.status] ?? RESULT_STATUS_CONFIG["normal"] : null

                      return (
                        <ResultRow
                          key={param.id}
                          param={param}
                          existing={existing}
                          isEditing={isEditing}
                          statusCfg={statusCfg}
                          isSaving={saveResultMutation.isPending}
                          onEdit={() => setEditingResultId(param.id)}
                          onCancel={() => setEditingResultId(null)}
                          onSave={(data) =>
                            saveResultMutation.mutate({
                              parameterId: param.id,
                              data,
                              existingId: existing?.id,
                            })
                          }
                        />
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            <DialogFooter className="gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/lab-orders/${orderId}/print`, "_blank")}
                className="gap-1"
              >
                <Printer className="h-4 w-4" />
                Распечатать
              </Button>
              <Button variant="outline" onClick={onClose}>
                Закрыть
              </Button>
            </DialogFooter>
          </>
        ) : (
          <p className="p-4 text-muted-foreground">Заказ не найден</p>
        )}
      </DialogContent>
    </Dialog>
  )
}


interface ResultRowProps {
  param: any
  existing: any
  isEditing: boolean
  statusCfg: { label: string; className: string } | null
  isSaving: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (data: ResultEntryData) => void
}

function ResultRow({ param, existing, isEditing, statusCfg, isSaving, onEdit, onCancel, onSave }: ResultRowProps) {
  const form = useForm<ResultEntryData>({
    resolver: zodResolver(resultEntrySchema),
    defaultValues: {
      numericValue: existing?.numericValue != null ? String(existing.numericValue) : "",
      value: existing?.value ?? "",
      status: existing?.status ?? "normal",
      notes: existing?.notes ?? "",
    },
  })

  return isEditing ? (
    <TableRow className="bg-muted/20">
      <TableCell colSpan={5}>
        <form
          onSubmit={form.handleSubmit(onSave)}
          className="grid grid-cols-12 gap-2 items-end py-1"
        >
          <div className="col-span-2 text-sm font-medium">{param.name}</div>
          <div className="col-span-2">
            <Input
              placeholder="Число"
              type="number"
              step="any"
              {...form.register("numericValue")}
              className="h-8 text-sm"
            />
            {form.formState.errors.numericValue && (
              <p className="text-xs text-destructive">{form.formState.errors.numericValue.message}</p>
            )}
          </div>
          <div className="col-span-2">
            <Input
              placeholder="Текст"
              {...form.register("value")}
              className="h-8 text-sm"
            />
          </div>
          <div className="col-span-3">
            <Select
              onValueChange={(v) => form.setValue("status", v)}
              defaultValue={form.getValues("status")}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Норма</SelectItem>
                <SelectItem value="low">Понижен</SelectItem>
                <SelectItem value="high">Повышен</SelectItem>
                <SelectItem value="critical_low">Крит. низкий</SelectItem>
                <SelectItem value="critical_high">Крит. высокий</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3 flex gap-1">
            <Button type="submit" size="sm" disabled={isSaving} className="h-8">
              {isSaving ? "..." : "Сохранить"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </form>
      </TableCell>
    </TableRow>
  ) : (
    <TableRow
      className="hover-elevate cursor-pointer"
      onClick={onEdit}
    >
      <TableCell className="font-medium text-sm">{param.name}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{param.unit}</TableCell>
      <TableCell className="font-semibold">
        {existing
          ? (existing.numericValue != null
              ? Number(existing.numericValue).toString()
              : existing.value ?? "—")
          : <span className="text-muted-foreground text-sm italic">Не введено</span>}
      </TableCell>
      <TableCell>
        {existing && statusCfg ? (
          <span className={`text-xs px-1.5 py-0.5 rounded ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {existing?.status === "critical_low" || existing?.status === "critical_high" ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : existing?.status === "low" || existing?.status === "high" ? (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        ) : existing ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : null}
      </TableCell>
    </TableRow>
  )
}


const studyFormSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  category: z.string().optional(),
  description: z.string().optional(),
  sampleType: z.string().optional(),
  estimatedDuration: z.string().optional(),
})

type StudyFormData = z.infer<typeof studyFormSchema>

interface StudyDialogProps {
  study: Record<string, unknown> | null
  onClose: () => void
}

function StudyDialog({ study, onClose }: StudyDialogProps) {
  const { toast } = useToast()
  const isEdit = !!study

  const form = useForm<StudyFormData>({
    resolver: zodResolver(studyFormSchema),
    defaultValues: {
      name: (study?.name as string) ?? "",
      category: (study?.category as string) ?? "",
      description: (study?.description as string) ?? "",
      sampleType: (study?.sampleType as string) ?? "",
      estimatedDuration: study?.estimatedDuration != null ? String(study.estimatedDuration) : "",
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: StudyFormData) => {
      const payload = {
        ...data,
        estimatedDuration: data.estimatedDuration ? Number(data.estimatedDuration) : undefined,
        isActive: true,
      }
      if (isEdit) {
        const res = await apiRequest("PUT", `/api/lab-studies/${study.id}`, payload)
        if (!res.ok) throw new Error("Ошибка сохранения")
        return res.json()
      }
      const res = await apiRequest("POST", "/api/lab-studies", payload)
      if (!res.ok) throw new Error("Ошибка создания")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-studies"] })
      toast({ title: isEdit ? "Исследование обновлено" : "Исследование создано" })
      onClose()
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать исследование" : "Новое исследование"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-3">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Название *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Категория</FormLabel>
                <FormControl><Input placeholder="Биохимия, ОАК, ОАМ..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="sampleType" render={({ field }) => (
              <FormItem>
                <FormLabel>Тип материала</FormLabel>
                <FormControl><Input placeholder="Кровь, моча, мазок..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="estimatedDuration" render={({ field }) => (
              <FormItem>
                <FormLabel>Время выполнения (ч)</FormLabel>
                <FormControl><Input type="number" min={0} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Описание</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function StudiesTab({ searchTerm }: { searchTerm: string }) {
  const { toast } = useToast()
  const [dialogStudy, setDialogStudy] = useState<Record<string, unknown> | null | "new">(null)

  const { data: labStudies = [], isLoading } = useQuery({ queryKey: ["/api/lab-studies"] })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/lab-studies/${id}`, { isActive: !isActive })
      if (!res.ok) throw new Error("Ошибка")
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/lab-studies"] }),
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  })

  const filtered = useMemo(() => {
    if (!Array.isArray(labStudies)) return []
    const q = searchTerm.toLowerCase()
    return (labStudies as Record<string, unknown>[]).filter((s) =>
      !q ||
      (s.name as string)?.toLowerCase().includes(q) ||
      (s.category as string)?.toLowerCase().includes(q) ||
      (s.description as string)?.toLowerCase().includes(q)
    )
  }, [labStudies, searchTerm])

  const grouped = useMemo(() => {
    const m: Record<string, Record<string, unknown>[]> = {}
    filtered.forEach((s) => {
      const cat = (s.category as string) || "Прочее"
      if (!m[cat]) m[cat] = []
      m[cat].push(s)
    })
    return m
  }, [filtered])

  if (isLoading) return (
    <div className="space-y-2 pt-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1" onClick={() => setDialogStudy("new")}>
          <Plus className="h-4 w-4" />
          Добавить исследование
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Microscope className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Исследования не найдены</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, studies]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{category}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Исследование</TableHead>
                  <TableHead>Материал</TableHead>
                  <TableHead>Длит.</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studies.map((s) => (
                  <TableRow key={s.id as string}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Microscope className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <div className="font-medium">{s.name as string}</div>
                          {s.description && <div className="text-xs text-muted-foreground">{s.description as string}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{(s.sampleType as string) || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {s.estimatedDuration != null ? `${s.estimatedDuration} ч` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? "default" : "secondary"}>
                        {s.isActive ? "Активно" : "Неактивно"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDialogStudy(s)}
                          title="Редактировать"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleActiveMutation.mutate({ id: s.id as string, isActive: s.isActive as boolean })}
                          title={s.isActive ? "Деактивировать" : "Активировать"}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {s.isActive ? <X className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}

      {dialogStudy && (
        <StudyDialog
          study={dialogStudy === "new" ? null : dialogStudy}
          onClose={() => setDialogStudy(null)}
        />
      )}
    </div>
  )
}


function OrdersTab({
  searchTerm,
  onOpenOrder,
  onNewOrder,
}: {
  searchTerm: string
  onOpenOrder: (id: string) => void
  onNewOrder: () => void
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all")

  const { data: rawOrders = [], isLoading } = useQuery({ queryKey: ["/api/lab-orders"] })
  const { data: patients = [] } = useQuery({ queryKey: ["/api/patients"] })
  const { data: doctors = [] } = useQuery({ queryKey: ["/api/doctors"] })
  const { data: labStudies = [] } = useQuery({ queryKey: ["/api/lab-studies"] })

  const patientMap = useMemo(() => {
    const m: Record<string, any> = {}
    ;(patients as any[]).forEach((p: any) => { m[p.id] = p })
    return m
  }, [patients])

  const doctorMap = useMemo(() => {
    const m: Record<string, any> = {}
    ;(doctors as any[]).forEach((d: any) => { m[d.id] = d })
    return m
  }, [doctors])

  const studyMap = useMemo(() => {
    const m: Record<string, any> = {}
    ;(labStudies as any[]).forEach((s: any) => { m[s.id] = s })
    return m
  }, [labStudies])

  // getLabOrders returns rows with both labOrders.* and patients.* joined – need to normalize
  const orders = useMemo(() => {
    const raw = rawOrders as any[]
    return raw.map((row: any) => {
      // row might be { lab_orders: {...}, patients: {...} } from leftJoin OR flat
      if (row.lab_orders) return row.lab_orders
      return row
    })
  }, [rawOrders])

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return orders.filter((o: any) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false
      if (urgencyFilter !== "all" && o.urgency !== urgencyFilter) return false
      if (q) {
        const patient = patientMap[o.patientId]
        const doctor = doctorMap[o.doctorId]
        const study = studyMap[o.studyId]
        if (
          !patient?.name?.toLowerCase().includes(q) &&
          !doctor?.name?.toLowerCase().includes(q) &&
          !study?.name?.toLowerCase().includes(q) &&
          !o.orderNumber?.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [orders, searchTerm, statusFilter, urgencyFilter, patientMap, doctorMap, studyMap])

  if (isLoading) return (
    <div className="space-y-2 pt-2">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Срочность" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="routine">Плановые</SelectItem>
            <SelectItem value="urgent">Срочные</SelectItem>
            <SelectItem value="stat">Немедленно</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onNewOrder} className="ml-auto gap-1" size="sm">
          <Plus className="h-4 w-4" />
          Новый заказ
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Заказы не найдены</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Номер</TableHead>
              <TableHead>Исследование</TableHead>
              <TableHead>Пациент</TableHead>
              <TableHead>Врач</TableHead>
              <TableHead>Срочность</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order: any) => {
              const patient = patientMap[order.patientId]
              const doctor = doctorMap[order.doctorId]
              const study = studyMap[order.studyId]
              const statusCfg = getStatusConfig(order.status ?? "pending")

              return (
                <TableRow
                  key={order.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => onOpenOrder(order.id)}
                >
                  <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                  <TableCell className="font-medium">{study?.name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <User className="h-3 w-3 shrink-0" />
                      {patient?.name ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{doctor?.name ?? "—"}</TableCell>
                  <TableCell>
                    {order.urgency && order.urgency !== "routine" && (
                      <Badge variant={URGENCY_BADGE_VARIANT[order.urgency] ?? "outline"} className="text-xs">
                        {URGENCY_LABELS[order.urgency] ?? order.urgency}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {order.orderedDate
                      ? format(new Date(order.orderedDate), "dd.MM.yyyy", { locale: ru })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusCfg.color}>{statusCfg.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}


export default function Laboratory() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("orders")
  const [createOrderOpen, setCreateOrderOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const { data: rawOrders = [] } = useQuery({ queryKey: ["/api/lab-orders"] })
  const orders = useMemo(() => {
    const raw = rawOrders as any[]
    return raw.map((row: any) => (row.lab_orders ? row.lab_orders : row))
  }, [rawOrders])

  const statsMap = useMemo(() => {
    const counts: Record<string, number> = {}
    orders.forEach((o: any) => {
      counts[o.status ?? "pending"] = (counts[o.status ?? "pending"] ?? 0) + 1
    })
    return counts
  }, [orders])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Microscope className="h-8 w-8 text-primary" />
            Лаборатория
          </h1>
          <p className="text-muted-foreground mt-1">
            Управление анализами и лабораторными заказами
          </p>
        </div>
        <Button onClick={() => setCreateOrderOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          Новый заказ
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ожидают", value: statsMap["pending"] ?? 0, color: "text-muted-foreground" },
          { label: "В работе", value: (statsMap["sample_taken"] ?? 0) + (statsMap["in_progress"] ?? 0), color: "text-blue-600 dark:text-blue-400" },
          { label: "Срочные", value: orders.filter((o: any) => o.urgency === "urgent" || o.urgency === "stat").length, color: "text-orange-600 dark:text-orange-400" },
          { label: "Готово сегодня", value: orders.filter((o: any) => o.status === "completed" && o.completedDate && new Date(o.completedDate).toDateString() === new Date().toDateString()).length, color: "text-green-600 dark:text-green-400" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Поиск по номеру, пациенту, врачу, исследованию..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
          data-testid="input-search"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">
            <ClipboardList className="h-4 w-4 mr-1" />
            Заказы
            {orders.filter((o: any) => o.status !== "completed" && o.status !== "cancelled").length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {orders.filter((o: any) => o.status !== "completed" && o.status !== "cancelled").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="studies">
            <Microscope className="h-4 w-4 mr-1" />
            Справочник
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <OrdersTab
                searchTerm={searchTerm}
                onOpenOrder={setSelectedOrderId}
                onNewOrder={() => setCreateOrderOpen(true)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="studies" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <StudiesTab searchTerm={searchTerm} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateOrderDialog
        open={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
      />

      <OrderDetailDialog
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  )
}
