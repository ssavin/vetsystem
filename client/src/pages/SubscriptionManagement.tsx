import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { type SubscriptionPlan, type ClinicSubscription, type Branch } from "@shared/schema"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Building, Package } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { apiRequest } from "@/lib/queryClient"

// Custom form schemas to handle string dates for inputs
const planFormSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  price: z.string().min(1, "Цена обязательна"),
  billingPeriod: z.string().default("monthly"),
  maxBranches: z.number().int().positive().default(1),
  maxUsers: z.number().int().positive().default(5),
  maxPatients: z.number().int().positive().nullable().optional(),
  features: z.any().optional(),
  isActive: z.boolean().default(true)
})

const subscriptionFormSchema = z.object({
  branchId: z.string().min(1, "Филиал обязателен"),
  planId: z.string().min(1, "План обязателен"),
  status: z.string().default("active"),
  startDate: z.string().min(1, "Дата начала обязательна"),
  endDate: z.string().min(1, "Дата окончания обязательна"),
  autoRenew: z.boolean().optional(),
  trialEndDate: z.string().nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
  cancelReason: z.string().nullable().optional()
})

type PlanFormValues = z.infer<typeof planFormSchema>
type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>

export default function SubscriptionManagement() {
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [editingSubscription, setEditingSubscription] = useState<ClinicSubscription | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch subscription plans
  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/billing/plans']
  })

  // Fetch all subscriptions (admin only)
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery<ClinicSubscription[]>({
    queryKey: ['/api/billing/subscriptions']
  })

  // Fetch branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['/api/branches/active']
  })

  // Plan mutations
  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormValues) => apiRequest('/api/billing/plans', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/plans'] })
      toast({ title: "Успех", description: "Тарифный план создан" })
      setIsPlanDialogOpen(false)
      planForm.reset()
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<PlanFormValues> }) => 
      apiRequest(`/api/billing/plans/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/plans'] })
      toast({ title: "Успех", description: "Тарифный план обновлен" })
      setEditingPlan(null)
      planForm.reset()
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/billing/plans/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/plans'] })
      toast({ title: "Успех", description: "Тарифный план удален" })
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  // Subscription mutations
  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: SubscriptionFormValues) => {
      // Convert string dates to Date objects
      const payload = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        trialEndDate: data.trialEndDate ? new Date(data.trialEndDate) : null,
        cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : null
      }
      return apiRequest('/api/billing/subscription', 'POST', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/subscriptions'] })
      toast({ title: "Успех", description: "Подписка создана" })
      setIsSubscriptionDialogOpen(false)
      subscriptionForm.reset()
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<SubscriptionFormValues> }) => {
      // Convert string dates to Date objects
      const payload = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        trialEndDate: data.trialEndDate ? new Date(data.trialEndDate) : undefined,
        cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : undefined
      }
      return apiRequest(`/api/billing/subscription/${id}`, 'PATCH', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/subscriptions'] })
      toast({ title: "Успех", description: "Подписка обновлена" })
      setEditingSubscription(null)
      subscriptionForm.reset()
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "0",
      billingPeriod: "monthly",
      maxBranches: 1,
      maxUsers: 10,
      maxPatients: null,
      features: [],
      isActive: true
    }
  })

  const subscriptionForm = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      branchId: "",
      planId: "",
      status: "active",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      autoRenew: false,
      trialEndDate: null,
      cancelledAt: null,
      cancelReason: null
    }
  })

  const onPlanSubmit = (values: PlanFormValues) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data: values })
    } else {
      createPlanMutation.mutate(values)
    }
  }

  const onSubscriptionSubmit = (values: SubscriptionFormValues) => {
    if (editingSubscription) {
      updateSubscriptionMutation.mutate({ id: editingSubscription.id, data: values })
    } else {
      createSubscriptionMutation.mutate(values)
    }
  }

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    planForm.reset({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      billingPeriod: plan.billingPeriod,
      maxBranches: plan.maxBranches || 1,
      maxUsers: plan.maxUsers || 10,
      maxPatients: plan.maxPatients,
      features: plan.features || [],
      isActive: plan.isActive ?? true
    })
    setIsPlanDialogOpen(true)
  }

  const handleEditSubscription = (subscription: ClinicSubscription) => {
    setEditingSubscription(subscription)
    subscriptionForm.reset({
      branchId: subscription.branchId,
      planId: subscription.planId,
      status: subscription.status,
      startDate: new Date(subscription.startDate).toISOString().split('T')[0],
      endDate: new Date(subscription.endDate).toISOString().split('T')[0],
      autoRenew: subscription.autoRenew || false,
      trialEndDate: subscription.trialEndDate ? new Date(subscription.trialEndDate).toISOString().split('T')[0] : null,
      cancelledAt: subscription.cancelledAt ? new Date(subscription.cancelledAt).toISOString().split('T')[0] : null,
      cancelReason: subscription.cancelReason || null
    })
    setIsSubscriptionDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      expired: "destructive",
      suspended: "secondary",
      canceled: "secondary",
      trial: "secondary"
    }
    return <Badge variant={variants[status] || "default"} data-testid={`status-${status}`}>{status}</Badge>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Subscription Plans Section */}
      <Card data-testid="card-plans">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="title-plans">
              <Package className="h-5 w-5" />
              Тарифные планы
            </CardTitle>
            <CardDescription data-testid="description-plans">
              Управление тарифными планами подписок
            </CardDescription>
          </div>
          <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingPlan(null)
                  planForm.reset()
                }}
                data-testid="button-create-plan"
              >
                <Plus className="h-4 w-4 mr-2" />
                Создать план
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" data-testid="dialog-plan">
              <DialogHeader>
                <DialogTitle data-testid="dialog-title-plan">
                  {editingPlan ? "Редактировать план" : "Создать план"}
                </DialogTitle>
                <DialogDescription>
                  Укажите параметры тарифного плана
                </DialogDescription>
              </DialogHeader>
              <Form {...planForm}>
                <form onSubmit={planForm.handleSubmit(onPlanSubmit)} className="space-y-4">
                  <FormField
                    control={planForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название плана</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Стандартный" data-testid="input-plan-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={planForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Описание</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} placeholder="Описание плана" data-testid="input-plan-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={planForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Цена (руб/мес)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field}
                              data-testid="input-plan-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={planForm.control}
                      name="maxUsers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Макс. пользователей</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              value={field.value || ""}
                              onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-plan-max-users"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-4 justify-end">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsPlanDialogOpen(false)
                        setEditingPlan(null)
                        planForm.reset()
                      }}
                      data-testid="button-cancel-plan"
                    >
                      Отмена
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                      data-testid="button-submit-plan"
                    >
                      {editingPlan ? "Сохранить" : "Создать"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <div className="text-center py-8" data-testid="loading-plans">Загрузка...</div>
          ) : (
            <Table data-testid="table-plans">
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Пользователи</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium" data-testid={`text-plan-name-${plan.id}`}>{plan.name}</div>
                        {plan.description && (
                          <div className="text-sm text-muted-foreground" data-testid={`text-plan-desc-${plan.id}`}>
                            {plan.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-plan-price-${plan.id}`}>
                      {parseFloat(plan.price).toLocaleString('ru-RU')} ₽/мес
                    </TableCell>
                    <TableCell data-testid={`text-plan-users-${plan.id}`}>
                      до {plan.maxUsers}
                    </TableCell>
                    <TableCell>
                      {plan.isActive ? (
                        <Badge variant="default" data-testid={`badge-active-${plan.id}`}>Активен</Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-inactive-${plan.id}`}>Неактивен</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPlan(plan)}
                          data-testid={`button-edit-plan-${plan.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Удалить этот план?")) {
                              deletePlanMutation.mutate(plan.id)
                            }
                          }}
                          data-testid={`button-delete-plan-${plan.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Clinic Subscriptions Section */}
      <Card data-testid="card-subscriptions">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="title-subscriptions">
              <Building className="h-5 w-5" />
              Подписки клиник
            </CardTitle>
            <CardDescription data-testid="description-subscriptions">
              Управление подписками филиалов клиники
            </CardDescription>
          </div>
          <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingSubscription(null)
                  subscriptionForm.reset()
                }}
                data-testid="button-create-subscription"
              >
                <Plus className="h-4 w-4 mr-2" />
                Создать подписку
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-subscription">
              <DialogHeader>
                <DialogTitle data-testid="dialog-title-subscription">
                  {editingSubscription ? "Редактировать подписку" : "Создать подписку"}
                </DialogTitle>
                <DialogDescription>
                  Укажите параметры подписки для филиала
                </DialogDescription>
              </DialogHeader>
              <Form {...subscriptionForm}>
                <form onSubmit={subscriptionForm.handleSubmit(onSubscriptionSubmit)} className="space-y-4">
                  <FormField
                    control={subscriptionForm.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Филиал</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-branch">
                              <SelectValue placeholder="Выберите филиал" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id} data-testid={`option-branch-${branch.id}`}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subscriptionForm.control}
                    name="planId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тарифный план</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-plan">
                              <SelectValue placeholder="Выберите план" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {plans.filter(p => p.isActive).map((plan) => (
                              <SelectItem key={plan.id} value={plan.id} data-testid={`option-plan-${plan.id}`}>
                                {plan.name} - {parseFloat(plan.price)} ₽/мес
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subscriptionForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Статус</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active" data-testid="option-status-active">Активна</SelectItem>
                            <SelectItem value="trial" data-testid="option-status-trial">Пробный период</SelectItem>
                            <SelectItem value="expired" data-testid="option-status-expired">Истекла</SelectItem>
                            <SelectItem value="suspended" data-testid="option-status-suspended">Приостановлена</SelectItem>
                            <SelectItem value="canceled" data-testid="option-status-canceled">Отменена</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={subscriptionForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дата начала</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} data-testid="input-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={subscriptionForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дата окончания</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} data-testid="input-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-4 justify-end">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsSubscriptionDialogOpen(false)
                        setEditingSubscription(null)
                        subscriptionForm.reset()
                      }}
                      data-testid="button-cancel-subscription"
                    >
                      Отмена
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createSubscriptionMutation.isPending || updateSubscriptionMutation.isPending}
                      data-testid="button-submit-subscription"
                    >
                      {editingSubscription ? "Сохранить" : "Создать"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {subscriptionsLoading ? (
            <div className="text-center py-8" data-testid="loading-subscriptions">Загрузка...</div>
          ) : (
            <Table data-testid="table-subscriptions">
              <TableHeader>
                <TableRow>
                  <TableHead>Филиал</TableHead>
                  <TableHead>План</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => {
                  const branch = branches.find(b => b.id === sub.branchId)
                  const plan = plans.find(p => p.id === sub.planId)
                  return (
                    <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                      <TableCell data-testid={`text-branch-${sub.id}`}>
                        {branch?.name || sub.branchId}
                      </TableCell>
                      <TableCell data-testid={`text-plan-${sub.id}`}>
                        {plan?.name || sub.planId}
                      </TableCell>
                      <TableCell data-testid={`text-period-${sub.id}`}>
                        {format(new Date(sub.startDate), 'dd.MM.yyyy', { locale: ru })} - 
                        {format(new Date(sub.endDate), 'dd.MM.yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sub.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSubscription(sub)}
                          data-testid={`button-edit-subscription-${sub.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
