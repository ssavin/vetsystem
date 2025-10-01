import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Building2, CreditCard, Package, Plus, RefreshCw, Users } from "lucide-react";

export default function SuperAdminPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("subscriptions");

  // Queries
  const { data: subscriptions, isLoading: loadingSubscriptions } = useQuery<any[]>({
    queryKey: ["/api/superadmin/subscriptions"],
  });

  const { data: payments, isLoading: loadingPayments } = useQuery<any[]>({
    queryKey: ["/api/superadmin/payments"],
  });

  const { data: branches, isLoading: loadingBranches } = useQuery<any[]>({
    queryKey: ["/api/superadmin/branches"],
  });

  const { data: plans, isLoading: loadingPlans } = useQuery<any[]>({
    queryKey: ["/api/billing/plans"],
  });

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: "bg-green-500",
      expired: "bg-red-500",
      cancelled: "bg-gray-500",
      trial: "bg-blue-500",
      paid: "bg-green-500",
      pending: "bg-yellow-500",
      failed: "bg-red-500",
    };

    return (
      <Badge className={statusColors[status] || "bg-gray-500"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-superadmin-title">
            Административная панель
          </h1>
          <p className="text-muted-foreground">
            Управление всеми клиентами и подписками системы
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-superadmin">
          <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">
            <Package className="w-4 h-4 mr-2" />
            Подписки
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <CreditCard className="w-4 h-4 mr-2" />
            Платежи
          </TabsTrigger>
          <TabsTrigger value="branches" data-testid="tab-branches">
            <Building2 className="w-4 h-4 mr-2" />
            Филиалы
          </TabsTrigger>
          <TabsTrigger value="plans" data-testid="tab-plans">
            <Users className="w-4 h-4 mr-2" />
            Тарифы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Все подписки клиентов</CardTitle>
                  <CardDescription>
                    Просмотр и управление подписками всех клиник
                  </CardDescription>
                </div>
                <CreateSubscriptionDialog />
              </div>
            </CardHeader>
            <CardContent>
              {loadingSubscriptions ? (
                <p>Загрузка...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Филиал</TableHead>
                      <TableHead>План</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Начало</TableHead>
                      <TableHead>Окончание</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Автопродление</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions?.map((sub) => (
                      <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                        <TableCell className="font-medium">
                          {sub.branchName}
                          <div className="text-sm text-muted-foreground">{sub.branchEmail}</div>
                        </TableCell>
                        <TableCell>{sub.planName}</TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell>
                          {format(new Date(sub.startDate), "dd.MM.yyyy", { locale: ru })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(sub.endDate), "dd.MM.yyyy", { locale: ru })}
                        </TableCell>
                        <TableCell>{sub.planPrice} ₽</TableCell>
                        <TableCell>
                          {sub.autoRenew ? (
                            <Badge variant="default">Да</Badge>
                          ) : (
                            <Badge variant="outline">Нет</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Все платежи</CardTitle>
              <CardDescription>
                История платежей от всех клиентов
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <p>Загрузка...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Филиал</TableHead>
                      <TableHead>План</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Метод</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments?.map((payment) => (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell>
                          {format(new Date(payment.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}
                        </TableCell>
                        <TableCell>
                          {payment.branchName}
                        </TableCell>
                        <TableCell>{payment.planName}</TableCell>
                        <TableCell className="font-medium">{payment.amount} ₽</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Все филиалы</CardTitle>
                  <CardDescription>
                    Управление клиниками-клиентами
                  </CardDescription>
                </div>
                <CreateBranchDialog />
              </div>
            </CardHeader>
            <CardContent>
              {loadingBranches ? (
                <p>Загрузка...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Адрес</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches?.map((branch) => (
                      <TableRow key={branch.id} data-testid={`row-branch-${branch.id}`}>
                        <TableCell className="font-medium">{branch.name}</TableCell>
                        <TableCell>
                          {branch.address}, {branch.city}
                        </TableCell>
                        <TableCell>{branch.phone}</TableCell>
                        <TableCell>{branch.email}</TableCell>
                        <TableCell>{getStatusBadge(branch.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Тарифные планы</CardTitle>
                  <CardDescription>
                    Создание и управление тарифами
                  </CardDescription>
                </div>
                <CreatePlanDialog />
              </div>
            </CardHeader>
            <CardContent>
              {loadingPlans ? (
                <p>Загрузка...</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {plans?.map((plan) => (
                    <Card key={plan.id} data-testid={`card-plan-${plan.id}`}>
                      <CardHeader>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Цена:</span>
                            <span className="font-bold">{plan.price} ₽</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Период:</span>
                            <span>{plan.billingPeriod === 'monthly' ? 'Месяц' : 'Год'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Статус:</span>
                            {plan.isActive ? (
                              <Badge variant="default">Активен</Badge>
                            ) : (
                              <Badge variant="outline">Неактивен</Badge>
                            )}
                          </div>
                        </div>
                        <EditPlanDialog plan={plan} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateBranchDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    region: "",
    phone: "",
    email: "",
    status: "active",
  });

  const createBranchMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/superadmin/branches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/branches"] });
      toast({
        title: "Филиал создан",
        description: "Новый филиал успешно добавлен в систему",
      });
      setOpen(false);
      setFormData({
        name: "",
        address: "",
        city: "",
        region: "",
        phone: "",
        email: "",
        status: "active",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать филиал",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBranchMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-branch">
          <Plus className="w-4 h-4 mr-2" />
          Создать филиал
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Создать новый филиал</DialogTitle>
          <DialogDescription>
            Добавьте нового клиента (клинику) в систему
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                data-testid="input-branch-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Город *</Label>
              <Input
                id="city"
                data-testid="input-branch-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Адрес *</Label>
            <Input
              id="address"
              data-testid="input-branch-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                data-testid="input-branch-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="input-branch-email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Регион</Label>
            <Input
              id="region"
              data-testid="input-branch-region"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-branch">
              Отмена
            </Button>
            <Button type="submit" disabled={createBranchMutation.isPending} data-testid="button-submit-branch">
              {createBranchMutation.isPending ? "Создание..." : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateSubscriptionDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    branchId: "",
    planId: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "active",
    autoRenew: true,
  });

  const { data: branches } = useQuery<any[]>({
    queryKey: ["/api/superadmin/branches"],
  });

  const { data: plans } = useQuery<any[]>({
    queryKey: ["/api/billing/plans"],
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/superadmin/subscriptions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/subscriptions"] });
      toast({
        title: "Подписка создана",
        description: "Новая подписка успешно добавлена",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать подписку",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSubscriptionMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-subscription">
          <Plus className="w-4 h-4 mr-2" />
          Создать подписку
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать подписку</DialogTitle>
          <DialogDescription>
            Назначьте подписку филиалу
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branchId">Филиал *</Label>
            <Select
              value={formData.branchId}
              onValueChange={(value) => setFormData({ ...formData, branchId: value })}
            >
              <SelectTrigger data-testid="select-subscription-branch">
                <SelectValue placeholder="Выберите филиал" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="planId">Тарифный план *</Label>
            <Select
              value={formData.planId}
              onValueChange={(value) => setFormData({ ...formData, planId: value })}
            >
              <SelectTrigger data-testid="select-subscription-plan">
                <SelectValue placeholder="Выберите план" />
              </SelectTrigger>
              <SelectContent>
                {plans?.filter(p => p.isActive).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - {plan.price} ₽
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Дата начала *</Label>
              <Input
                id="startDate"
                type="date"
                data-testid="input-subscription-start"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Дата окончания *</Label>
              <Input
                id="endDate"
                type="date"
                data-testid="input-subscription-end"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-subscription">
              Отмена
            </Button>
            <Button type="submit" disabled={createSubscriptionMutation.isPending} data-testid="button-submit-subscription">
              {createSubscriptionMutation.isPending ? "Создание..." : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreatePlanDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    billingPeriod: "monthly",
    features: "",
    isActive: true,
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/superadmin/plans", {
        ...data,
        features: data.features ? data.features.split('\n').filter((f: string) => f.trim()) : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/plans"] });
      toast({
        title: "Тариф создан",
        description: "Новый тарифный план добавлен",
      });
      setOpen(false);
      setFormData({
        name: "",
        description: "",
        price: "",
        billingPeriod: "monthly",
        features: "",
        isActive: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать тариф",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPlanMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-plan">
          <Plus className="w-4 h-4 mr-2" />
          Создать тариф
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать тарифный план</DialogTitle>
          <DialogDescription>
            Добавьте новый тариф для клиентов
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              data-testid="input-plan-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              data-testid="input-plan-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Цена (₽) *</Label>
              <Input
                id="price"
                type="number"
                data-testid="input-plan-price"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingPeriod">Период *</Label>
              <Select
                value={formData.billingPeriod}
                onValueChange={(value) => setFormData({ ...formData, billingPeriod: value })}
              >
                <SelectTrigger data-testid="select-plan-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Месячный</SelectItem>
                  <SelectItem value="yearly">Годовой</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-plan">
              Отмена
            </Button>
            <Button type="submit" disabled={createPlanMutation.isPending} data-testid="button-submit-plan">
              {createPlanMutation.isPending ? "Создание..." : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPlanDialog({ plan }: { plan: any }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: plan.name,
    description: plan.description || "",
    price: plan.price,
    isActive: plan.isActive,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", `/api/superadmin/plans/${plan.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/plans"] });
      toast({
        title: "Тариф обновлён",
        description: "Изменения успешно сохранены",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить тариф",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlanMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-4" data-testid={`button-edit-plan-${plan.id}`}>
          Редактировать
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать тариф</DialogTitle>
          <DialogDescription>
            Измените параметры тарифного плана
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Название *</Label>
            <Input
              id="edit-name"
              data-testid="input-edit-plan-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Описание</Label>
            <Input
              id="edit-description"
              data-testid="input-edit-plan-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-price">Цена (₽) *</Label>
            <Input
              id="edit-price"
              type="number"
              data-testid="input-edit-plan-price"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="edit-isActive"
              data-testid="checkbox-edit-plan-active"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="edit-isActive">Тариф активен</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-edit-plan">
              Отмена
            </Button>
            <Button type="submit" disabled={updatePlanMutation.isPending} data-testid="button-submit-edit-plan">
              {updatePlanMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
