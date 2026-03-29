import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { 
  Users, Crown, AlertTriangle, UserMinus, UserPlus, RefreshCw,
  Megaphone, Send, Plus, Calendar, Check, Search, ChevronLeft, ChevronRight,
  Pencil, Trash2, TrendingUp, Wallet, BarChart3
} from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

interface Owner {
  id: string
  name: string
  phone: string | null
  email: string | null
  segment: string | null
  totalSpent: string | null
  visitCount: number | null
  lastVisitAt: string | null
  averageCheck: string | null
}

interface CrmStats {
  segmentCounts: { segment: string; count: number }[]
  totalLTV: number
  averageCheck: number
  totalOwners: number
}

interface MarketingCampaign {
  id: string
  name: string
  channel: string
  status: string
  targetSegments: string[] | null
  content: string
  subject: string | null
  scheduledAt: string | null
  totalRecipients: number
  sentCount: number
  deliveredCount: number
  createdAt: string
  updatedAt: string
}

const SEGMENT_LABELS: Record<string, string> = {
  new: "Новые",
  regular: "Активные",
  vip: "VIP",
  at_risk: "Спящие",
  lost: "Потерянные"
}

const CHANNEL_LABELS: Record<string, string> = {
  sms: "SMS",
  email: "Email",
  push: "Push"
}

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  scheduled: "Запланирована",
  sent: "Отправлена",
  cancelled: "Отменена"
}

function SegmentIcon({ segment }: { segment: string }) {
  switch (segment) {
    case 'vip': return <Crown className="h-4 w-4 text-yellow-500" />
    case 'regular': return <Users className="h-4 w-4 text-blue-500" />
    case 'at_risk': return <AlertTriangle className="h-4 w-4 text-orange-500" />
    case 'lost': return <UserMinus className="h-4 w-4 text-red-500" />
    default: return <UserPlus className="h-4 w-4 text-green-500" />
  }
}

function SegmentBadge({ segment }: { segment: string | null }) {
  const seg = segment || 'new'
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    vip: "default",
    regular: "secondary",
    new: "outline",
    at_risk: "secondary",
    lost: "destructive"
  }
  return (
    <Badge variant={variants[seg] || "outline"}>
      <SegmentIcon segment={seg} />
      <span className="ml-1">{SEGMENT_LABELS[seg] || seg}</span>
    </Badge>
  )
}

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num) || num === 0) return "—"
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(num)
}

// ========================
// CRM Stats Cards
// ========================

function StatsCards({ stats, isLoading }: { stats: CrmStats | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    )
  }

  const segMap: Record<string, number> = {}
  stats?.segmentCounts.forEach(s => { segMap[s.segment] = s.count })

  const segCards = [
    { label: "Всего клиентов", value: stats?.totalOwners?.toLocaleString('ru-RU') || "0", icon: Users, sub: `Средний чек: ${stats ? formatMoney(stats.averageCheck) : "—"}` },
    { label: "Новые", value: `${segMap['new'] || 0}`, icon: UserPlus, sub: "Новые клиенты" },
    { label: "Активные", value: `${segMap['regular'] || 0}`, icon: Users, sub: "Регулярные посещения" },
    { label: "VIP", value: `${segMap['vip'] || 0}`, icon: Crown, sub: "Топ 10% по выручке" },
    { label: "Спящие", value: `${segMap['at_risk'] || 0}`, icon: AlertTriangle, sub: "60–180 дней без визита" },
    { label: "Потерянные", value: `${segMap['lost'] || 0}`, icon: UserMinus, sub: "Более 180 дней без визита" },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {segCards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{c.label}</CardTitle>
            <c.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{c.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ========================
// Owners Tab
// ========================

function OwnersTab() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [segmentFilter, setSegmentFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [editSegmentOwner, setEditSegmentOwner] = useState<Owner | null>(null)
  const [newSegment, setNewSegment] = useState("")
  const LIMIT = 50

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data: ownersData, isLoading } = useQuery<{ data: Owner[]; total: number; totalPages: number }>({
    queryKey: ['/api/crm/owners', segmentFilter, debouncedSearch, page, LIMIT],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      })
      if (segmentFilter !== 'all') params.set('segment', segmentFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      const res = await fetch(`/api/crm/owners?${params}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    }
  })

  const { data: stats, isLoading: statsLoading } = useQuery<CrmStats>({
    queryKey: ['/api/crm/stats']
  })

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/crm/segments/recalculate')
      return res.json()
    },
    onSuccess: (data: { updated: number }) => {
      toast({ title: "Сегменты обновлены", description: `Обновлено клиентов: ${data.updated}` })
      queryClient.invalidateQueries({ queryKey: ['/api/crm/owners'] })
      queryClient.invalidateQueries({ queryKey: ['/api/crm/stats'] })
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось пересчитать сегменты", variant: "destructive" })
    }
  })

  const updateSegmentMutation = useMutation({
    mutationFn: async ({ id, segment }: { id: string; segment: string }) => {
      const res = await apiRequest('PATCH', `/api/crm/owners/${id}/segment`, { segment })
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Сегмент обновлён" })
      setEditSegmentOwner(null)
      queryClient.invalidateQueries({ queryKey: ['/api/crm/owners'] })
      queryClient.invalidateQueries({ queryKey: ['/api/crm/stats'] })
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось изменить сегмент", variant: "destructive" })
    }
  })

  const owners = ownersData?.data || []
  const total = ownersData?.total || 0
  const totalPages = ownersData?.totalPages || 1

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} isLoading={statsLoading} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, телефону, email..."
            className="pl-9"
          />
        </div>
        <Select value={segmentFilter} onValueChange={(v) => { setSegmentFilter(v); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Все сегменты" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все сегменты</SelectItem>
            {Object.entries(SEGMENT_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => recalculateMutation.mutate()}
          disabled={recalculateMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
          Пересчитать сегменты
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : owners.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Клиенты не найдены</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Сегмент</TableHead>
                  <TableHead>Последний визит</TableHead>
                  <TableHead className="text-right">Визиты</TableHead>
                  <TableHead className="text-right">Сумма трат</TableHead>
                  <TableHead className="text-right">Ср. чек</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{owner.name}</p>
                        <p className="text-xs text-muted-foreground">{owner.phone || owner.email || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell><SegmentBadge segment={owner.segment} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {owner.lastVisitAt
                        ? format(new Date(owner.lastVisitAt), 'd MMM yyyy', { locale: ru })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">{owner.visitCount ?? 0}</TableCell>
                    <TableCell className="text-right text-sm">{formatMoney(owner.totalSpent)}</TableCell>
                    <TableCell className="text-right text-sm">{formatMoney(owner.averageCheck)}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setEditSegmentOwner(owner); setNewSegment(owner.segment || 'new') }}
                        title="Изменить сегмент"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Показано {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} из {total.toLocaleString('ru-RU')}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!editSegmentOwner} onOpenChange={(open) => { if (!open) setEditSegmentOwner(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Изменить сегмент</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{editSegmentOwner?.name}</p>
            <Select value={newSegment} onValueChange={setNewSegment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SEGMENT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSegmentOwner(null)}>Отмена</Button>
            <Button
              onClick={() => editSegmentOwner && updateSegmentMutation.mutate({ id: editSegmentOwner.id, segment: newSegment })}
              disabled={updateSegmentMutation.isPending}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========================
// Campaigns Tab
// ========================

const DEFAULT_CAMPAIGN = {
  name: '',
  channel: 'sms',
  content: '',
  subject: '',
  targetSegments: ['regular', 'vip'] as string[],
  scheduledAt: '',
}

function CampaignsTab() {
  const { toast } = useToast()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editCampaign, setEditCampaign] = useState<MarketingCampaign | null>(null)
  const [form, setForm] = useState({ ...DEFAULT_CAMPAIGN })

  const { data: campaigns, isLoading } = useQuery<MarketingCampaign[]>({
    queryKey: ['/api/crm/campaigns']
  })

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof DEFAULT_CAMPAIGN) => {
      const res = await apiRequest('POST', '/api/crm/campaigns', {
        ...data,
        scheduledAt: data.scheduledAt || null
      })
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Кампания создана" })
      setShowCreateDialog(false)
      setForm({ ...DEFAULT_CAMPAIGN })
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] })
    },
    onError: () => toast({ title: "Ошибка", description: "Не удалось создать кампанию", variant: "destructive" })
  })

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof DEFAULT_CAMPAIGN> }) => {
      const res = await apiRequest('PUT', `/api/crm/campaigns/${id}`, {
        ...data,
        scheduledAt: data.scheduledAt || null
      })
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Кампания обновлена" })
      setEditCampaign(null)
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] })
    },
    onError: () => toast({ title: "Ошибка", description: "Не удалось обновить кампанию", variant: "destructive" })
  })

  const cancelCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('PATCH', `/api/crm/campaigns/${id}`, { status: 'cancelled' })
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Кампания отменена" })
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] })
    },
    onError: () => toast({ title: "Ошибка", description: "Не удалось отменить кампанию", variant: "destructive" })
  })

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/crm/campaigns/${id}`)
    },
    onSuccess: () => {
      toast({ title: "Кампания удалена" })
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] })
    },
    onError: () => toast({ title: "Ошибка", description: "Не удалось удалить кампанию", variant: "destructive" })
  })

  const openEdit = (campaign: MarketingCampaign) => {
    setEditCampaign(campaign)
    setForm({
      name: campaign.name,
      channel: campaign.channel,
      content: campaign.content,
      subject: campaign.subject || '',
      targetSegments: campaign.targetSegments || [],
      scheduledAt: campaign.scheduledAt
        ? format(new Date(campaign.scheduledAt), "yyyy-MM-dd'T'HH:mm")
        : '',
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      scheduled: "secondary",
      sent: "default",
      cancelled: "destructive"
    }
    return <Badge variant={variants[status] || "outline"}>{CAMPAIGN_STATUS_LABELS[status] || status}</Badge>
  }

  const CampaignForm = ({ value, onChange }: { value: typeof DEFAULT_CAMPAIGN; onChange: (v: typeof DEFAULT_CAMPAIGN) => void }) => (
    <div className="space-y-4">
      <div>
        <Label>Название</Label>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Например: Акция на вакцинацию"
        />
      </div>
      <div>
        <Label>Канал</Label>
        <Select value={value.channel} onValueChange={(v) => onChange({ ...value, channel: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="push">Push-уведомление</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.channel === 'email' && (
        <div>
          <Label>Тема письма</Label>
          <Input
            value={value.subject}
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
            placeholder="Тема email-рассылки"
          />
        </div>
      )}
      <div>
        <Label>Целевые сегменты</Label>
        <div className="flex flex-wrap gap-3 mt-2">
          {Object.entries(SEGMENT_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`seg-${key}`}
                checked={value.targetSegments.includes(key)}
                onCheckedChange={(checked) => {
                  const segs = checked
                    ? [...value.targetSegments, key]
                    : value.targetSegments.filter(s => s !== key)
                  onChange({ ...value, targetSegments: segs })
                }}
              />
              <Label htmlFor={`seg-${key}`} className="text-sm font-normal">{label}</Label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>Текст сообщения</Label>
        <Textarea
          value={value.content}
          onChange={(e) => onChange({ ...value, content: e.target.value })}
          placeholder="Текст рассылки..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Переменные: {'{name}'}, {'{pet_name}'}, {'{clinic_name}'}
        </p>
      </div>
      <div>
        <Label>Дата отправки (необязательно)</Label>
        <Input
          type="datetime-local"
          value={value.scheduledAt}
          onChange={(e) => onChange({ ...value, scheduledAt: e.target.value })}
        />
      </div>
    </div>
  )

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Маркетинговые кампании</h3>
          <p className="text-sm text-muted-foreground">SMS, Email и Push рассылки — планирование без реальной отправки</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) setForm({ ...DEFAULT_CAMPAIGN }) }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Новая кампания
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать кампанию</DialogTitle>
            </DialogHeader>
            <CampaignForm value={form} onChange={setForm} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Отмена</Button>
              <Button
                onClick={() => createCampaignMutation.mutate(form)}
                disabled={!form.name || !form.content || createCampaignMutation.isPending}
              >
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    {getStatusBadge(campaign.status)}
                    <Badge variant="outline">{CHANNEL_LABELS[campaign.channel] || campaign.channel}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(campaign)}
                      disabled={campaign.status === 'cancelled'}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {campaign.status !== 'cancelled' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => cancelCampaignMutation.mutate(campaign.id)}
                        disabled={cancelCampaignMutation.isPending}
                        title="Отменить кампанию"
                      >
                        <Send className="h-4 w-4 text-orange-500" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить кампанию?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Кампания «{campaign.name}» будет удалена. Это действие нельзя отменить.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCampaignMutation.mutate(campaign.id)}>
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardDescription>
                  Создана: {format(new Date(campaign.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                  {campaign.scheduledAt && (
                    <span className="ml-3 flex items-center gap-1 inline-flex">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(campaign.scheduledAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
                  <span className="text-muted-foreground">Получателей: {campaign.totalRecipients}</span>
                  <span className="text-muted-foreground">Отправлено: {campaign.sentCount}</span>
                  <span className="text-muted-foreground">Доставлено: {campaign.deliveredCount}</span>
                </div>
                {campaign.targetSegments && campaign.targetSegments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {campaign.targetSegments.map((seg) => (
                      <SegmentBadge key={seg} segment={seg} />
                    ))}
                  </div>
                )}
                {campaign.content && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{campaign.content}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
            <p className="text-muted-foreground">Нет созданных кампаний</p>
            <p className="text-sm text-muted-foreground mt-1">
              Создайте первую маркетинговую кампанию для клиентской базы
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editCampaign} onOpenChange={(open) => { if (!open) setEditCampaign(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать кампанию</DialogTitle>
          </DialogHeader>
          <CampaignForm value={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCampaign(null)}>Отмена</Button>
            <Button
              onClick={() => editCampaign && updateCampaignMutation.mutate({ id: editCampaign.id, data: form })}
              disabled={!form.name || !form.content || updateCampaignMutation.isPending}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========================
// Main CRM Page
// ========================

export default function CRM() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CRM</h1>
        <p className="text-muted-foreground">Сегментация клиентов, аналитика и маркетинг</p>
      </div>

      <Tabs defaultValue="owners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="owners">
            <Users className="h-4 w-4 mr-2" />
            Клиенты
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Megaphone className="h-4 w-4 mr-2" />
            Кампании
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owners">
          <OwnersTab />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
