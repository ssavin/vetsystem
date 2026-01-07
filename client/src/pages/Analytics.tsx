import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { 
  TrendingUp, TrendingDown, Users, Calendar, DollarSign, Clock, 
  AlertTriangle, RefreshCw, UserMinus, Activity, Phone, Mail
} from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import { ru } from "date-fns/locale"

interface DoctorKPI {
  doctorId: string
  doctorName: string
  specialization: string | null
  appointmentCount: number
  totalRevenue: number
  averageBill: number
  trend: number
  uniquePatients: number
}

interface DoctorKPIsResponse {
  period: { start: string; end: string }
  doctors: DoctorKPI[]
  totals: {
    totalAppointments: number
    totalRevenue: number
    averageBill: number
  }
}

interface ForecastDay {
  date: string
  dayOfWeek: string
  predicted: number
  scheduled: number
  available: number
  utilizationPercent: number
  capacityWarning: boolean
}

interface WorkloadForecastResponse {
  forecast: ForecastDay[]
  insights: {
    busiestDays: { day: number; average: number }[]
    peakHours: { hour: number; percentage: number }[]
    upcomingCapacityWarnings: number
  }
}

interface ChurnClient {
  id: string
  name: string
  phone: string | null
  email: string | null
  lastVisit: string | null
  daysSinceLastVisit: number | null
  visitCount: number
  lifetimeRevenue: number
  riskScore: number
}

interface ChurnAnalysisResponse {
  summary: {
    totalClients: number
    activeClients: number
    atRiskClients: number
    churnedClients: number
    churnRate: number
    atRiskRate: number
    lostRevenue: number
    atRiskRevenue: number
    inactiveThresholdDays: number
  }
  churned: ChurnClient[]
  atRisk: ChurnClient[]
  recentlyActive: ChurnClient[]
}

interface RevenueTrend {
  month: string
  revenue: number
  invoiceCount: number
  averageInvoice: number
}

interface RevenueTrendsResponse {
  trends: RevenueTrend[]
  summary: {
    totalRevenue: number
    averageMonthly: number
    growthPercent: number
    bestMonth: RevenueTrend
  }
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', { 
    style: 'currency', 
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'd MMM', { locale: ru })
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState('30')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const startDate = subDays(new Date(), parseInt(dateRange)).toISOString()
  const endDate = new Date().toISOString()

  const { data: doctorKpis, isLoading: kpisLoading, isError: kpisError, refetch: refetchKpis } = useQuery<DoctorKPIsResponse>({
    queryKey: ['/api/analytics/doctor-kpis', { startDate, endDate }],
    refetchInterval: autoRefresh ? 60000 : false,
    retry: 2
  })

  const { data: workloadForecast, isLoading: forecastLoading, isError: forecastError, refetch: refetchForecast } = useQuery<WorkloadForecastResponse>({
    queryKey: ['/api/analytics/workload-forecast', { days: 14 }],
    refetchInterval: autoRefresh ? 60000 : false,
    retry: 2
  })

  const { data: churnAnalysis, isLoading: churnLoading, isError: churnError, refetch: refetchChurn } = useQuery<ChurnAnalysisResponse>({
    queryKey: ['/api/analytics/churn-analysis', { inactiveDays: 180 }],
    refetchInterval: autoRefresh ? 60000 : false,
    retry: 2
  })

  const { data: revenueTrends, isLoading: trendsLoading, isError: trendsError, refetch: refetchTrends } = useQuery<RevenueTrendsResponse>({
    queryKey: ['/api/analytics/revenue-trends', { months: 12 }],
    refetchInterval: autoRefresh ? 60000 : false,
    retry: 2
  })

  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center p-8 text-muted-foreground">
      <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
      <span>{message}</span>
    </div>
  )

  const handleRefresh = () => {
    refetchKpis()
    refetchForecast()
    refetchChurn()
    refetchTrends()
    setLastUpdated(new Date())
  }

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => setLastUpdated(new Date()), 60000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-analytics-title">Аналитика</h1>
          <p className="text-muted-foreground">
            Интерактивные дашборды в реальном времени
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 дней</SelectItem>
              <SelectItem value="30">30 дней</SelectItem>
              <SelectItem value="90">90 дней</SelectItem>
              <SelectItem value="180">180 дней</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="button-auto-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Авто' : 'Ручной'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Обновлено: {format(lastUpdated, 'HH:mm')}
          </span>
        </div>
      </div>

      <Tabs defaultValue="kpis" className="space-y-4">
        <TabsList data-testid="analytics-tabs">
          <TabsTrigger value="kpis" data-testid="tab-kpis">KPI врачей</TabsTrigger>
          <TabsTrigger value="workload" data-testid="tab-workload">Загрузка</TabsTrigger>
          <TabsTrigger value="churn" data-testid="tab-churn">Отток клиентов</TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Выручка</TabsTrigger>
        </TabsList>

        <TabsContent value="kpis" className="space-y-4">
          {kpisError ? (
            <Card>
              <CardContent className="pt-6">
                <ErrorMessage message="Не удалось загрузить KPI врачей. Попробуйте обновить страницу." />
              </CardContent>
            </Card>
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего приёмов</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-total-appointments">
                    {doctorKpis?.totals.totalAppointments || 0}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Общая выручка</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-total-revenue">
                    {formatCurrency(doctorKpis?.totals.totalRevenue || 0)}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Средний чек</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-average-bill">
                    {formatCurrency(doctorKpis?.totals.averageBill || 0)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Выручка по врачам</CardTitle>
                <CardDescription>За выбранный период</CardDescription>
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={doctorKpis?.doctors || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis 
                        type="category" 
                        dataKey="doctorName" 
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: 'var(--foreground)' }}
                      />
                      <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Средний чек по врачам</CardTitle>
                <CardDescription>Сравнение среднего чека</CardDescription>
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={doctorKpis?.doctors || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="doctorName" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tickFormatter={(v) => `${v}₽`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="averageBill" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Детальные KPI врачей</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {kpisLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))
                  ) : (
                    doctorKpis?.doctors.map((doctor, index) => (
                      <div 
                        key={doctor.doctorId} 
                        className="flex items-center justify-between p-4 rounded-lg border"
                        data-testid={`doctor-kpi-${doctor.doctorId}`}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          >
                            {doctor.doctorName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">{doctor.doctorName}</div>
                            <div className="text-sm text-muted-foreground">
                              {doctor.specialization || 'Ветеринар'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <div className="text-sm text-muted-foreground">Приёмов</div>
                            <div className="font-bold">{doctor.appointmentCount}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Пациентов</div>
                            <div className="font-bold">{doctor.uniquePatients}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Ср. чек</div>
                            <div className="font-bold">{formatCurrency(doctor.averageBill)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Выручка</div>
                            <div className="font-bold">{formatCurrency(doctor.totalRevenue)}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            {doctor.trend > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : doctor.trend < 0 ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : null}
                            <Badge variant={doctor.trend > 0 ? "default" : doctor.trend < 0 ? "destructive" : "secondary"}>
                              {doctor.trend > 0 ? '+' : ''}{doctor.trend}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        <TabsContent value="workload" className="space-y-4">
          {forecastError ? (
            <Card>
              <CardContent className="pt-6">
                <ErrorMessage message="Не удалось загрузить данные загрузки. Попробуйте обновить страницу." />
              </CardContent>
            </Card>
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Предупреждения</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                {forecastLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-2xl font-bold text-orange-500" data-testid="text-capacity-warnings">
                    {workloadForecast?.insights.upcomingCapacityWarnings || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">дней с высокой загрузкой</p>
              </CardContent>
            </Card>
            {[0, 1, 2].map((i) => {
              const day = workloadForecast?.insights.busiestDays[i]
              return (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {i === 0 ? 'Самый загруженный' : i === 1 ? '2-й по загрузке' : '3-й по загрузке'}
                    </CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {forecastLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{day ? dayNames[day.day] : '-'}</div>
                        <p className="text-xs text-muted-foreground">
                          ~{day?.average || 0} приёмов/день
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Прогноз загрузки на 14 дней</CardTitle>
                <CardDescription>Запланировано vs прогнозируемо</CardDescription>
              </CardHeader>
              <CardContent>
                {forecastLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={workloadForecast?.forecast || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(d) => formatDate(d)}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(d) => format(new Date(d), 'd MMMM', { locale: ru })}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="predicted" 
                        name="Прогноз"
                        stroke="hsl(var(--chart-2))" 
                        fill="hsl(var(--chart-2))" 
                        fillOpacity={0.3}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="scheduled" 
                        name="Записано"
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Загрузка по часам</CardTitle>
                <CardDescription>Пиковые часы за последние 90 дней</CardDescription>
              </CardHeader>
              <CardContent>
                {forecastLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={workloadForecast?.insights.peakHours || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                      <YAxis tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="percentage" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Календарь загрузки</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {forecastLoading ? (
                  Array.from({ length: 14 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))
                ) : (
                  workloadForecast?.forecast.map((day) => (
                    <div 
                      key={day.date}
                      className={`p-3 rounded-lg border text-center ${
                        day.capacityWarning 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' 
                          : 'border-border'
                      }`}
                      data-testid={`forecast-day-${day.date}`}
                    >
                      <div className="text-xs text-muted-foreground">{day.dayOfWeek}</div>
                      <div className="font-bold">{formatDate(day.date)}</div>
                      <Progress 
                        value={day.utilizationPercent} 
                        className="h-2 mt-2"
                      />
                      <div className="text-xs mt-1">
                        {day.scheduled} / {day.scheduled + day.available}
                      </div>
                      {day.capacityWarning && (
                        <AlertTriangle className="h-4 w-4 text-orange-500 mx-auto mt-1" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        <TabsContent value="churn" className="space-y-4">
          {churnError ? (
            <Card>
              <CardContent className="pt-6">
                <ErrorMessage message="Не удалось загрузить анализ оттока. Попробуйте обновить страницу." />
              </CardContent>
            </Card>
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего клиентов</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {churnLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-total-clients">
                    {churnAnalysis?.summary.totalClients || 0}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">В зоне риска</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                {churnLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-orange-500" data-testid="text-at-risk">
                      {churnAnalysis?.summary.atRiskClients || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {churnAnalysis?.summary.atRiskRate}% от базы
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Отток</CardTitle>
                <UserMinus className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                {churnLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-500" data-testid="text-churned">
                      {churnAnalysis?.summary.churnedClients || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {churnAnalysis?.summary.churnRate}% от базы
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Упущенная выручка</CardTitle>
                <DollarSign className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                {churnLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-500" data-testid="text-lost-revenue">
                      {formatCurrency(churnAnalysis?.summary.lostRevenue || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      потенциал к возврату
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Распределение клиентов</CardTitle>
              </CardHeader>
              <CardContent>
                {churnLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Активные', value: churnAnalysis?.summary.activeClients || 0 },
                          { name: 'В зоне риска', value: churnAnalysis?.summary.atRiskClients || 0 },
                          { name: 'Отток', value: churnAnalysis?.summary.churnedClients || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        <Cell fill="hsl(var(--chart-2))" />
                        <Cell fill="hsl(25 95% 53%)" />
                        <Cell fill="hsl(0 84% 60%)" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-orange-500">Клиенты в зоне риска</CardTitle>
                <CardDescription>
                  Потенциальная выручка: {formatCurrency(churnAnalysis?.summary.atRiskRevenue || 0)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {churnLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))
                    ) : (
                      churnAnalysis?.atRisk.slice(0, 10).map((client) => (
                        <div 
                          key={client.id}
                          className="flex items-center justify-between p-2 rounded border"
                          data-testid={`at-risk-client-${client.id}`}
                        >
                          <div>
                            <div className="font-medium">{client.name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {client.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />{client.phone}
                                </span>
                              )}
                              <span>{client.daysSinceLastVisit} дней без визита</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(client.lifetimeRevenue)}</div>
                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                              Риск {client.riskScore}%
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-500">Ушедшие клиенты (топ по выручке)</CardTitle>
              <CardDescription>
                Не посещали более {churnAnalysis?.summary.inactiveThresholdDays || 180} дней
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {churnLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))
                  ) : (
                    churnAnalysis?.churned.slice(0, 20).map((client) => (
                      <div 
                        key={client.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        data-testid={`churned-client-${client.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                            <UserMinus className="h-5 w-5 text-red-500" />
                          </div>
                          <div>
                            <div className="font-medium">{client.name}</div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              {client.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />{client.phone}
                                </span>
                              )}
                              {client.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />{client.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatCurrency(client.lifetimeRevenue)}</div>
                          <div className="text-sm text-muted-foreground">
                            {client.visitCount} визитов • {client.daysSinceLastVisit} дней назад
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {trendsError ? (
            <Card>
              <CardContent className="pt-6">
                <ErrorMessage message="Не удалось загрузить тренды выручки. Попробуйте обновить страницу." />
              </CardContent>
            </Card>
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Выручка за год</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-yearly-revenue">
                    {formatCurrency(revenueTrends?.summary.totalRevenue || 0)}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Среднемесячная</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-monthly-average">
                    {formatCurrency(revenueTrends?.summary.averageMonthly || 0)}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Рост</CardTitle>
                {(revenueTrends?.summary.growthPercent || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div 
                    className={`text-2xl font-bold ${
                      (revenueTrends?.summary.growthPercent || 0) >= 0 
                        ? 'text-green-500' 
                        : 'text-red-500'
                    }`}
                    data-testid="text-growth"
                  >
                    {(revenueTrends?.summary.growthPercent || 0) > 0 ? '+' : ''}
                    {revenueTrends?.summary.growthPercent || 0}%
                  </div>
                )}
                <p className="text-xs text-muted-foreground">vs прошлый месяц</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Лучший месяц</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold" data-testid="text-best-month">
                      {revenueTrends?.summary.bestMonth?.month 
                        ? format(new Date(revenueTrends.summary.bestMonth.month + '-01'), 'MMM yyyy', { locale: ru })
                        : '-'
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(revenueTrends?.summary.bestMonth?.revenue || 0)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Динамика выручки</CardTitle>
              <CardDescription>Помесячная выручка за последний год</CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={revenueTrends?.trends || []}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(m) => format(new Date(m + '-01'), 'MMM', { locale: ru })}
                    />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      labelFormatter={(m) => format(new Date(m + '-01'), 'MMMM yyyy', { locale: ru })}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'revenue' ? 'Выручка' : name === 'averageInvoice' ? 'Средний чек' : name
                      ]}
                    />
                    <Legend formatter={(value) => value === 'revenue' ? 'Выручка' : 'Средний чек'} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#revenueGradient)"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="averageInvoice" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Количество счетов по месяцам</CardTitle>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={revenueTrends?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(m) => format(new Date(m + '-01'), 'MMM', { locale: ru })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(m) => format(new Date(m + '-01'), 'MMMM yyyy', { locale: ru })}
                      formatter={(value: number) => [value, 'Счетов']}
                    />
                    <Bar dataKey="invoiceCount" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
