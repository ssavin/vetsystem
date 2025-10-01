import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { type ClinicSubscription, type SubscriptionPlan, type BillingNotification } from "@shared/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Calendar, Users, Package, AlertCircle, XCircle, RefreshCw } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { ru } from "date-fns/locale"
import { apiRequest } from "@/lib/queryClient"
import { useState } from "react"

export default function MySubscription() {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch current subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery<ClinicSubscription>({
    queryKey: ['/api/billing/subscription/current']
  })

  // Fetch subscription plan
  const { data: plan } = useQuery<SubscriptionPlan>({
    queryKey: ['/api/billing/plans', subscription?.planId],
    enabled: !!subscription?.planId,
    queryFn: async () => {
      const response = await fetch(`/api/billing/plans/${subscription?.planId}`)
      if (!response.ok) throw new Error('Failed to fetch plan')
      return response.json()
    }
  })

  // Fetch notifications
  const { data: notifications = [] } = useQuery<BillingNotification[]>({
    queryKey: ['/api/billing/notifications'],
    enabled: !!subscription
  })

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!subscription || !plan) throw new Error('No subscription or plan')
      return apiRequest('/api/billing/payment', 'POST', {
        subscriptionId: subscription.id,
        planId: plan.id
      })
    },
    onSuccess: (data: any) => {
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl
      } else {
        toast({ title: "Успех", description: "Платёж создан" })
        queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription/current'] })
      }
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (reason: string) => {
      return apiRequest('/api/billing/subscription/cancel', 'POST', { reason })
    },
    onSuccess: () => {
      toast({ title: "Успех", description: "Подписка отменена" })
      queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription/current'] })
      setIsCancelDialogOpen(false)
      setCancelReason("")
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  const handleCancelSubscription = () => {
    cancelSubscriptionMutation.mutate(cancelReason || "Отменено пользователем")
  }

  const handleRenewSubscription = () => {
    createPaymentMutation.mutate()
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      expired: "destructive",
      suspended: "secondary",
      canceled: "secondary",
      trial: "secondary"
    }
    const labels: Record<string, string> = {
      active: "Активна",
      expired: "Истекла",
      suspended: "Приостановлена",
      canceled: "Отменена",
      trial: "Пробный период"
    }
    return <Badge variant={variants[status] || "default"} data-testid={`status-${status}`}>
      {labels[status] || status}
    </Badge>
  }

  const getDaysUntilExpiry = () => {
    if (!subscription) return 0
    const endDate = new Date(subscription.endDate)
    return differenceInDays(endDate, new Date())
  }

  const daysLeft = getDaysUntilExpiry()
  const isExpiringSoon = daysLeft <= 7 && daysLeft > 0
  const isExpired = daysLeft <= 0

  if (subscriptionLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8" data-testid="loading-subscription">Загрузка...</div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" data-testid="alert-no-subscription">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Нет активной подписки</AlertTitle>
          <AlertDescription>
            У вашего филиала нет активной подписки. Обратитесь к администратору.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Уведомления */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Alert 
              key={notification.id} 
              variant={notification.type === 'expiring_soon' ? 'default' : 'destructive'}
              data-testid={`alert-notification-${notification.id}`}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {notification.type === 'expiring_soon' ? 'Подписка истекает' : 'Подписка истекла'}
              </AlertTitle>
              <AlertDescription>{notification.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Информация о подписке */}
      <Card data-testid="card-subscription-info">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2" data-testid="title-subscription">
                <CreditCard className="h-5 w-5" />
                Моя подписка
              </CardTitle>
              <CardDescription>Информация о вашей подписке на VetSystem</CardDescription>
            </div>
            {getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Тарифный план */}
          {plan && (
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium" data-testid="text-plan-name">{plan.name}</div>
                <div className="text-sm text-muted-foreground" data-testid="text-plan-description">
                  {plan.description || "Тарифный план"}
                </div>
                <div className="text-sm font-medium mt-1" data-testid="text-plan-price">
                  {parseFloat(plan.price).toLocaleString('ru-RU')} ₽/мес
                </div>
              </div>
            </div>
          )}

          {/* Срок действия */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">Срок действия</div>
              <div className="text-sm text-muted-foreground" data-testid="text-subscription-period">
                {format(new Date(subscription.startDate), 'dd MMMM yyyy', { locale: ru })} - 
                {format(new Date(subscription.endDate), 'dd MMMM yyyy', { locale: ru })}
              </div>
              {isExpiringSoon && (
                <div className="text-sm font-medium text-orange-600 dark:text-orange-400 mt-1" data-testid="text-expiring-soon">
                  Осталось {daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}
                </div>
              )}
              {isExpired && (
                <div className="text-sm font-medium text-destructive mt-1" data-testid="text-expired">
                  Подписка истекла
                </div>
              )}
            </div>
          </div>

          {/* Количество пользователей */}
          {plan && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Рабочие места</div>
                <div className="text-sm text-muted-foreground" data-testid="text-max-users">
                  До {plan.maxUsers} пользователей
                </div>
              </div>
            </div>
          )}

          {/* Действия */}
          <div className="flex gap-3 pt-4 border-t flex-wrap">
            <Button
              onClick={handleRenewSubscription}
              disabled={createPaymentMutation.isPending || subscription.status === 'canceled'}
              data-testid="button-renew"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Продлить подписку
            </Button>
            
            {subscription.status !== 'canceled' && (
              <Button
                variant="outline"
                onClick={() => setIsCancelDialogOpen(true)}
                disabled={cancelSubscriptionMutation.isPending}
                data-testid="button-cancel"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Отменить подписку
              </Button>
            )}
          </div>

          {subscription.cancelledAt && (
            <Alert data-testid="alert-cancelled">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Подписка отменена</AlertTitle>
              <AlertDescription>
                Дата отмены: {format(new Date(subscription.cancelledAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                {subscription.cancelReason && (
                  <div className="mt-1">Причина: {subscription.cancelReason}</div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Диалог отмены подписки */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent data-testid="dialog-cancel">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-cancel">Отменить подписку?</DialogTitle>
            <DialogDescription>
              Вы уверены что хотите отменить подписку? Доступ к системе будет ограничен после истечения текущего периода.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium" htmlFor="cancel-reason">
                Причина отмены (необязательно)
              </label>
              <Textarea
                id="cancel-reason"
                placeholder="Укажите причину отмены..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-2"
                data-testid="input-cancel-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCancelDialogOpen(false)}
              data-testid="button-cancel-dialog-close"
            >
              Назад
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-cancel-confirm"
            >
              Отменить подписку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
