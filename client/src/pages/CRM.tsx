import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import { 
  Users, Crown, AlertTriangle, UserMinus, UserPlus, RefreshCw,
  MessageSquare, Phone, Mail, Bell, Megaphone, Send, Plus, Calendar, Check
} from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

interface SegmentStats {
  segment: string
  count: number
}

interface Owner {
  id: string
  name: string
  phone: string | null
  email: string | null
  segment: string | null
}

interface HealthReminder {
  id: string
  patientId: string
  ownerId: string
  type: string
  title: string
  dueDate: string
  status: string
  notifyVia: string[] | null
}

interface MarketingCampaign {
  id: string
  name: string
  channel: string
  status: string
  targetSegments: string[] | null
  content: string
  scheduledAt: string | null
  totalRecipients: number
  sentCount: number
  deliveredCount: number
  createdAt: string
}

const SEGMENT_LABELS: Record<string, string> = {
  new: "Новые",
  regular: "Постоянные",
  vip: "VIP",
  at_risk: "Под угрозой",
  lost: "Потерянные"
}

const SEGMENT_COLORS: Record<string, string> = {
  new: "hsl(var(--chart-1))",
  regular: "hsl(var(--chart-2))",
  vip: "hsl(var(--chart-3))",
  at_risk: "hsl(var(--chart-4))",
  lost: "hsl(var(--chart-5))"
}

const REMINDER_TYPE_LABELS: Record<string, string> = {
  vaccination: "Вакцинация",
  deworming: "Дегельминтизация",
  flea_tick: "Обработка от паразитов",
  checkup: "Профосмотр",
  surgery_followup: "Послеоперационный осмотр",
  dental: "Стоматология",
  custom: "Другое"
}

const CHANNEL_LABELS: Record<string, string> = {
  sms: "SMS",
  email: "Email",
  push: "Push"
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
    <Badge variant={variants[seg] || "outline"} data-testid={`badge-segment-${seg}`}>
      <SegmentIcon segment={seg} />
      <span className="ml-1">{SEGMENT_LABELS[seg] || seg}</span>
    </Badge>
  )
}

function SegmentsTab() {
  const { toast } = useToast()
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)

  const { data: stats, isLoading: statsLoading } = useQuery<SegmentStats[]>({
    queryKey: ['/api/crm/segments/stats']
  })

  const { data: segmentClients, isLoading: clientsLoading } = useQuery<Owner[]>({
    queryKey: ['/api/crm/segments', selectedSegment, 'clients'],
    enabled: !!selectedSegment
  })

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/crm/segments/recalculate')
      return res.json()
    },
    onSuccess: (data: any) => {
      toast({ title: "Сегменты обновлены", description: `Обновлено клиентов: ${data.updated}` })
      queryClient.invalidateQueries({ queryKey: ['/api/crm/segments'] })
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось пересчитать сегменты", variant: "destructive" })
    }
  })

  const totalClients = stats?.reduce((sum, s) => sum + s.count, 0) || 0
  const chartData = stats?.map(s => ({
    name: SEGMENT_LABELS[s.segment] || s.segment,
    value: s.count,
    segment: s.segment
  })) || []

  if (statsLoading) {
    return <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Сегментация клиентов</h3>
          <p className="text-sm text-muted-foreground">Всего клиентов: {totalClients}</p>
        </div>
        <Button 
          onClick={() => recalculateMutation.mutate()} 
          disabled={recalculateMutation.isPending}
          data-testid="button-recalculate-segments"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
          Пересчитать
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Распределение по сегментам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(data) => setSelectedSegment(data.segment)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={SEGMENT_COLORS[entry.segment] || SEGMENT_COLORS.new}
                        cursor="pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>По сегментам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.map((s) => (
                <div 
                  key={s.segment}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover-elevate ${selectedSegment === s.segment ? 'bg-accent' : ''}`}
                  onClick={() => setSelectedSegment(s.segment)}
                  data-testid={`card-segment-${s.segment}`}
                >
                  <div className="flex items-center gap-3">
                    <SegmentIcon segment={s.segment} />
                    <span className="font-medium">{SEGMENT_LABELS[s.segment] || s.segment}</span>
                  </div>
                  <Badge variant="secondary">{s.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedSegment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SegmentIcon segment={selectedSegment} />
              Клиенты сегмента: {SEGMENT_LABELS[selectedSegment]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {segmentClients?.slice(0, 20).map((client) => (
                    <div 
                      key={client.id} 
                      className="flex items-center justify-between p-3 rounded-lg border"
                      data-testid={`row-client-${client.id}`}
                    >
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        {client.phone && (
                          <Button size="icon" variant="ghost" data-testid={`button-call-${client.id}`}>
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                        {client.email && (
                          <Button size="icon" variant="ghost" data-testid={`button-email-${client.id}`}>
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {segmentClients && segmentClients.length > 20 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      И ещё {segmentClients.length - 20} клиентов...
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function RemindersTab() {
  const { toast } = useToast()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data: upcomingReminders, isLoading } = useQuery<HealthReminder[]>({
    queryKey: ['/api/crm/reminders/upcoming']
  })

  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest('PATCH', `/api/crm/reminders/${id}`, { status })
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Напоминание обновлено" })
      queryClient.invalidateQueries({ queryKey: ['/api/crm/reminders'] })
    }
  })

  if (isLoading) {
    return <Skeleton className="h-64" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Напоминания о здоровье</h3>
          <p className="text-sm text-muted-foreground">Предстоящие в ближайшие 7 дней</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-reminder">
          <Plus className="h-4 w-4 mr-2" />
          Создать напоминание
        </Button>
      </div>

      {upcomingReminders && upcomingReminders.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcomingReminders.map((reminder) => (
            <Card key={reminder.id} data-testid={`card-reminder-${reminder.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {REMINDER_TYPE_LABELS[reminder.type] || reminder.type}
                  </Badge>
                  <Badge variant={reminder.status === 'pending' ? 'secondary' : 'default'}>
                    {reminder.status === 'pending' ? 'Ожидает' : reminder.status}
                  </Badge>
                </div>
                <CardTitle className="text-base">{reminder.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(reminder.dueDate), 'd MMMM yyyy', { locale: ru })}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {reminder.notifyVia?.map((channel) => (
                    <Badge key={channel} variant="outline" className="text-xs">
                      {CHANNEL_LABELS[channel] || channel}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateReminderMutation.mutate({ id: reminder.id, status: 'sent' })}
                    data-testid={`button-send-reminder-${reminder.id}`}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Отправить
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateReminderMutation.mutate({ id: reminder.id, status: 'completed' })}
                    data-testid={`button-complete-reminder-${reminder.id}`}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Выполнено
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет предстоящих напоминаний</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CampaignsTab() {
  const { toast } = useToast()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    channel: 'sms',
    content: '',
    targetSegments: ['regular', 'vip'] as string[]
  })

  const { data: campaigns, isLoading } = useQuery<MarketingCampaign[]>({
    queryKey: ['/api/crm/campaigns']
  })

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/crm/campaigns', newCampaign)
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Кампания создана" })
      setShowCreateDialog(false)
      setNewCampaign({ name: '', channel: 'sms', content: '', targetSegments: ['regular', 'vip'] })
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] })
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать кампанию", variant: "destructive" })
    }
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      scheduled: "secondary",
      running: "default",
      completed: "default",
      paused: "secondary",
      cancelled: "destructive"
    }
    const labels: Record<string, string> = {
      draft: "Черновик",
      scheduled: "Запланирована",
      running: "Выполняется",
      completed: "Завершена",
      paused: "Приостановлена",
      cancelled: "Отменена"
    }
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>
  }

  if (isLoading) {
    return <Skeleton className="h-64" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Маркетинговые кампании</h3>
          <p className="text-sm text-muted-foreground">SMS, Email и Push рассылки</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-campaign">
              <Megaphone className="h-4 w-4 mr-2" />
              Новая кампания
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Создать кампанию</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Название</Label>
                <Input 
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="Например: Акция на вакцинацию"
                  data-testid="input-campaign-name"
                />
              </div>
              <div>
                <Label>Канал</Label>
                <Select 
                  value={newCampaign.channel} 
                  onValueChange={(v) => setNewCampaign({ ...newCampaign, channel: v })}
                >
                  <SelectTrigger data-testid="select-campaign-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="push">Push-уведомление</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Целевые сегменты</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(SEGMENT_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={newCampaign.targetSegments.includes(key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewCampaign({ ...newCampaign, targetSegments: [...newCampaign.targetSegments, key] })
                          } else {
                            setNewCampaign({ ...newCampaign, targetSegments: newCampaign.targetSegments.filter(s => s !== key) })
                          }
                        }}
                        data-testid={`checkbox-segment-${key}`}
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Текст сообщения</Label>
                <Textarea 
                  value={newCampaign.content}
                  onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                  placeholder="Текст рассылки..."
                  rows={4}
                  data-testid="textarea-campaign-content"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Доступные переменные: {'{name}'}, {'{pet_name}'}, {'{clinic_name}'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Отмена
              </Button>
              <Button 
                onClick={() => createCampaignMutation.mutate()}
                disabled={!newCampaign.name || !newCampaign.content || createCampaignMutation.isPending}
                data-testid="button-save-campaign"
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
            <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <Badge variant="outline">{CHANNEL_LABELS[campaign.channel] || campaign.channel}</Badge>
                </div>
                <CardDescription>
                  Создана: {format(new Date(campaign.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Получателей: {campaign.totalRecipients}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Send className="h-4 w-4 text-muted-foreground" />
                    <span>Отправлено: {campaign.sentCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="h-4 w-4 text-muted-foreground" />
                    <span>Доставлено: {campaign.deliveredCount}</span>
                  </div>
                </div>
                {campaign.targetSegments && (
                  <div className="flex gap-2 mt-3">
                    {campaign.targetSegments.map((seg) => (
                      <SegmentBadge key={seg} segment={seg} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет созданных кампаний</p>
            <p className="text-sm text-muted-foreground mt-1">
              Создайте первую маркетинговую кампанию
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function CRM() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">CRM</h1>
        <p className="text-muted-foreground">Управление клиентами, напоминания и маркетинг</p>
      </div>

      <Tabs defaultValue="segments" className="space-y-4">
        <TabsList data-testid="tabs-crm">
          <TabsTrigger value="segments" data-testid="tab-segments">
            <Users className="h-4 w-4 mr-2" />
            Сегменты
          </TabsTrigger>
          <TabsTrigger value="reminders" data-testid="tab-reminders">
            <Bell className="h-4 w-4 mr-2" />
            Напоминания
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            <Megaphone className="h-4 w-4 mr-2" />
            Рассылки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="segments">
          <SegmentsTab />
        </TabsContent>

        <TabsContent value="reminders">
          <RemindersTab />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
