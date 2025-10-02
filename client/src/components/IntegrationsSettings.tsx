import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Settings, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from "lucide-react"

interface IntegrationCredential {
  id: string
  tenantId: string
  integrationType: string
  credentials: Record<string, string>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const moyskladSchema = z.object({
  apiToken: z.string().optional(),
  login: z.string().optional(),
  password: z.string().optional(),
  retailStoreId: z.string().min(1, "Retail Store ID обязателен"),
}).refine(data => data.apiToken || (data.login && data.password), {
  message: "Необходим либо API Token, либо Login + Password"
})

const yookassaSchema = z.object({
  shopId: z.string().min(1, "Shop ID обязателен"),
  secretKey: z.string().min(1, "Secret Key обязателен"),
})

type MoySkladFormData = z.infer<typeof moyskladSchema>
type YooKassaFormData = z.infer<typeof yookassaSchema>

function MoySkladIntegrationCard() {
  const [isOpen, setIsOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const { toast } = useToast()

  const { data: integration, isLoading } = useQuery<IntegrationCredential>({
    queryKey: ['/api/integration-credentials/moysklad'],
    retry: false,
  })

  const form = useForm<MoySkladFormData>({
    resolver: zodResolver(moyskladSchema),
    defaultValues: {
      apiToken: '',
      login: '',
      password: '',
      retailStoreId: '',
    },
  })

  // Update form when integration data loads
  useEffect(() => {
    if (integration?.credentials) {
      form.reset({
        apiToken: '',
        login: '',
        password: '',
        retailStoreId: integration.credentials.retailStoreId || '',
      })
    }
  }, [integration, form])

  const testMutation = useMutation({
    mutationFn: async (credentials: Record<string, string>) => {
      const response = await apiRequest('POST', '/api/integration-credentials/moysklad/test', { credentials })
      return await response.json()
    },
    onSuccess: (data: any) => {
      toast({
        title: data.success ? "Успешно" : "Ошибка",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: MoySkladFormData) => {
      const response = await apiRequest('PUT', '/api/integration-credentials/moysklad', {
        credentials: data,
        isActive: true,
      })
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integration-credentials/moysklad'] })
      toast({
        title: "Настройки сохранены",
        description: "Интеграция МойСклад настроена успешно",
      })
      setIsOpen(false)
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить настройки",
        variant: "destructive",
      })
    },
  })

  const handleTest = () => {
    const values = form.getValues()
    testMutation.mutate(values)
  }

  const onSubmit = (data: MoySkladFormData) => {
    saveMutation.mutate(data)
  }

  return (
    <Card data-testid="card-integration-moysklad">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              МойСклад
              {integration?.isActive ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Активна
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Не настроена
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Интеграция с системой учета МойСклад</CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-configure-moysklad">
                <Settings className="h-4 w-4 mr-2" />
                Настроить
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Настройка интеграции МойСклад</DialogTitle>
                <DialogDescription>
                  Введите данные для подключения к API МойСклад
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="apiToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Token (необязательно)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showToken ? "text" : "password"}
                              placeholder="Введите API токен"
                              data-testid="input-moysklad-apitoken"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowToken(!showToken)}
                            >
                              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="text-center text-sm text-muted-foreground">или</div>

                  <FormField
                    control={form.control}
                    name="login"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Логин</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Введите логин" data-testid="input-moysklad-login" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пароль</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Введите пароль"
                              data-testid="input-moysklad-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="retailStoreId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retail Store ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Введите Retail Store ID" data-testid="input-moysklad-storeid" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTest}
                      disabled={testMutation.isPending}
                      data-testid="button-test-moysklad"
                    >
                      {testMutation.isPending ? "Проверка..." : "Тест соединения"}
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-moysklad"
                    >
                      {saveMutation.isPending ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      {integration?.isActive && (
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Retail Store ID: {integration.credentials.retailStoreId}</p>
            <p className="text-xs mt-1">Последнее обновление: {new Date(integration.updatedAt).toLocaleString('ru-RU')}</p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function YooKassaIntegrationCard() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const { toast } = useToast()

  const { data: integration } = useQuery<IntegrationCredential>({
    queryKey: ['/api/integration-credentials/yookassa'],
    retry: false,
  })

  const form = useForm<YooKassaFormData>({
    resolver: zodResolver(yookassaSchema),
    defaultValues: {
      shopId: '',
      secretKey: '',
    },
  })

  // Update form when integration data loads
  useEffect(() => {
    if (integration?.credentials) {
      form.reset({
        shopId: integration.credentials.shopId || '',
        secretKey: '', // Never populate password fields
      })
    }
  }, [integration, form])

  const saveMutation = useMutation({
    mutationFn: async (data: YooKassaFormData) => {
      const response = await apiRequest('PUT', '/api/integration-credentials/yookassa', {
        credentials: data,
        isActive: true,
      })
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integration-credentials/yookassa'] })
      toast({
        title: "Настройки сохранены",
        description: "Интеграция ЮKassa настроена успешно",
      })
      setIsOpen(false)
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить настройки",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: YooKassaFormData) => {
    saveMutation.mutate(data)
  }

  return (
    <Card data-testid="card-integration-yookassa">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              ЮKassa
              {integration?.isActive ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Активна
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Не настроена
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Интеграция с платежной системой ЮKassa</CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-configure-yookassa">
                <Settings className="h-4 w-4 mr-2" />
                Настроить
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Настройка интеграции ЮKassa</DialogTitle>
                <DialogDescription>
                  Введите данные для подключения к API ЮKassa
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="shopId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shop ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Введите Shop ID" data-testid="input-yookassa-shopid" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secretKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secret Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showSecretKey ? "text" : "password"}
                              placeholder="Введите Secret Key"
                              data-testid="input-yookassa-secretkey"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowSecretKey(!showSecretKey)}
                            >
                              {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="w-full"
                    data-testid="button-save-yookassa"
                  >
                    {saveMutation.isPending ? "Сохранение..." : "Сохранить"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      {integration?.isActive && (
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Shop ID: {integration.credentials.shopId}</p>
            <p className="text-xs mt-1">Последнее обновление: {new Date(integration.updatedAt).toLocaleString('ru-RU')}</p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Интеграции</h2>
        <p className="text-muted-foreground">
          Настройте интеграции с внешними системами
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <MoySkladIntegrationCard />
        <YooKassaIntegrationCard />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Важная информация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Данные интеграций хранятся в защищенном виде для каждой клиники</p>
          <p>• Используйте тест соединения для проверки корректности настроек</p>
          <p>• При изменении credentials может потребоваться повторная синхронизация данных</p>
        </CardContent>
      </Card>
    </div>
  )
}
