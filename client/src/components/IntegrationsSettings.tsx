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
  isEnabled: boolean
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

const galenSchema = z.object({
  galenApiUser: z.string().min(1, "API пользователь обязателен"),
  galenApiKey: z.string().min(1, "API ключ обязателен"),
  galenIssuerId: z.string().min(1, "ID хозяйствующего субъекта обязателен"),
  galenServiceId: z.string().min(1, "ID сервиса обязателен"),
})

const smsruSchema = z.object({
  apiKey: z.string().min(1, "API ключ обязателен"),
})

const emailSchema = z.object({
  smtpHost: z.string().min(1, "SMTP хост обязателен"),
  smtpPort: z.string().min(1, "SMTP порт обязателен"),
  smtpUsername: z.string().min(1, "Имя пользователя обязательно"),
  smtpPassword: z.string().min(1, "Пароль обязателен"),
  fromEmail: z.string().email("Неверный формат email"),
  fromName: z.string().optional(),
})

const onecSchema = z.object({
  baseUrl: z.string().min(1, "Base URL обязателен"),
  username: z.string().min(1, "Имя пользователя обязательно"),
  password: z.string().min(1, "Пароль обязателен"),
  organizationKey: z.string().min(1, "Ключ организации обязателен"),
  cashRegisterKey: z.string().min(1, "Ключ кассы обязателен"),
})

type MoySkladFormData = z.infer<typeof moyskladSchema>
type YooKassaFormData = z.infer<typeof yookassaSchema>
type GalenFormData = z.infer<typeof galenSchema>
type SmsRuFormData = z.infer<typeof smsruSchema>
type EmailFormData = z.infer<typeof emailSchema>
type OneCFormData = z.infer<typeof onecSchema>

function SmsRuIntegrationCard() {
  const [isOpen, setIsOpen] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const { toast } = useToast()

  const { data: integration, isLoading } = useQuery<IntegrationCredential>({
    queryKey: ['/api/integration-credentials/smsru'],
    retry: false,
  })

  const form = useForm<SmsRuFormData>({
    resolver: zodResolver(smsruSchema),
    defaultValues: {
      apiKey: '',
    },
  })

  useEffect(() => {
    if (integration?.credentials) {
      form.reset({
        apiKey: '',
      })
    }
  }, [integration, form])

  const testMutation = useMutation({
    mutationFn: async (credentials: Record<string, string>) => {
      const response = await apiRequest('POST', '/api/integration-credentials/smsru/test', { credentials })
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
    mutationFn: async (data: SmsRuFormData) => {
      const response = await apiRequest('PUT', '/api/integration-credentials/smsru', {
        credentials: data,
        isActive: true,
      })
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integration-credentials/smsru'] })
      toast({
        title: "Настройки сохранены",
        description: "Интеграция SMS.RU настроена успешно",
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

  const onSubmit = (data: SmsRuFormData) => {
    saveMutation.mutate(data)
  }

  return (
    <Card data-testid="card-integration-smsru">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              SMS.RU
              {integration?.isEnabled ? (
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
            <CardDescription>Отправка SMS через SMS.RU API</CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-configure-smsru">
                <Settings className="h-4 w-4 mr-2" />
                Настроить
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Настройка интеграции SMS.RU</DialogTitle>
                <DialogDescription>
                  Введите API ключ для отправки SMS через SMS.RU
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API ключ</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showApiKey ? "text" : "password"}
                              placeholder="Введите API ключ SMS.RU"
                              data-testid="input-smsru-apikey"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowApiKey(!showApiKey)}
                            >
                              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
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
                      disabled={testMutation.isPending || !form.watch('apiKey')}
                      data-testid="button-test-smsru"
                    >
                      {testMutation.isPending ? "Проверка..." : "Тест соединения"}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={saveMutation.isPending}
                      data-testid="button-save-smsru"
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
      {integration?.isEnabled && (
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>API ключ настроен</p>
            <p className="text-xs mt-1">Последнее обновление: {new Date(integration.updatedAt).toLocaleString('ru-RU')}</p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

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
              {integration?.isEnabled ? (
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
      {integration?.isEnabled && (
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

function GalenIntegrationCard() {
  const [isOpen, setIsOpen] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showIssuerId, setShowIssuerId] = useState(false)
  const [showServiceId, setShowServiceId] = useState(false)
  const { toast } = useToast()

  const { data: galenConfig, isLoading } = useQuery<{
    galenApiUser?: string;
    galenApiKey?: string;
    galenIssuerId?: string;
    galenServiceId?: string;
    configured: boolean;
  }>({
    queryKey: ['/api/galen/credentials'],
    retry: false,
  })

  const form = useForm<GalenFormData>({
    resolver: zodResolver(galenSchema),
    defaultValues: {
      galenApiUser: '',
      galenApiKey: '',
      galenIssuerId: '',
      galenServiceId: '',
    },
  })

  // Update form when config data loads
  useEffect(() => {
    if (galenConfig?.configured) {
      form.reset({
        galenApiUser: galenConfig.galenApiUser || '',
        galenApiKey: galenConfig.galenApiKey || '',
        galenIssuerId: galenConfig.galenIssuerId || '',
        galenServiceId: galenConfig.galenServiceId || '',
      })
    }
  }, [galenConfig, form])

  const saveMutation = useMutation({
    mutationFn: async (data: GalenFormData) => {
      const response = await apiRequest('PUT', '/api/tenant/settings/galen', data)
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/galen/credentials'] })
      toast({
        title: "Настройки сохранены",
        description: "Интеграция с ГИС ВетИС Гален настроена успешно",
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

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/galen/test-connection')
      return await response.json()
    },
    onSuccess: (data: any) => {
      toast({
        title: data.success ? "Подключение успешно" : "Ошибка подключения",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось проверить подключение",
        variant: "destructive",
      })
    },
  })

  const handleTest = () => {
    testMutation.mutate()
  }

  const onSubmit = (data: GalenFormData) => {
    saveMutation.mutate(data)
  }

  return (
    <Card data-testid="card-integration-galen">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              ГИС ВетИС Гален
              {galenConfig?.configured ? (
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
            <CardDescription>Интеграция с Государственной информационной системой ВетИС Гален для регистрации животных и учета вакцинации</CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-configure-galen">
                <Settings className="h-4 w-4 mr-2" />
                Настроить
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Настройка интеграции ГИС ВетИС Гален</DialogTitle>
                <DialogDescription>
                  Введите учетные данные для подключения к API Гален
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="galenApiUser"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Пользователь</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Введите API пользователя" data-testid="input-galen-apiuser" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="galenApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Ключ</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showApiKey ? "text" : "password"}
                              placeholder="Введите API ключ"
                              data-testid="input-galen-apikey"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowApiKey(!showApiKey)}
                            >
                              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="galenIssuerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Хозяйствующего Субъекта</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showIssuerId ? "text" : "password"}
                              placeholder="Введите ID хозяйствующего субъекта"
                              data-testid="input-galen-issuerid"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowIssuerId(!showIssuerId)}
                            >
                              {showIssuerId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="galenServiceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Сервиса</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showServiceId ? "text" : "password"}
                              placeholder="Введите ID сервиса"
                              data-testid="input-galen-serviceid"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowServiceId(!showServiceId)}
                            >
                              {showServiceId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
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
                      disabled={testMutation.isPending || !galenConfig?.configured}
                      data-testid="button-test-galen"
                    >
                      {testMutation.isPending ? "Проверка..." : "Тест соединения"}
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-galen"
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
      {galenConfig?.configured && (
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>API Пользователь: {galenConfig.galenApiUser}</p>
            <p className="text-xs mt-1">Интеграция настроена</p>
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
              {integration?.isEnabled ? (
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
      {integration?.isEnabled && (
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

function OneCIntegrationCard() {
  const [isOpen, setIsOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['/api/onec/config'],
  })

  const { data: stats } = useQuery({
    queryKey: ['/api/onec/stats'],
    refetchInterval: 30000,
  })

  const form = useForm<OneCFormData>({
    resolver: zodResolver(onecSchema),
    defaultValues: {
      baseUrl: config?.data?.baseUrl || "",
      username: config?.data?.username || "",
      password: config?.data?.password || "",
      organizationKey: config?.data?.organizationKey || "",
      cashRegisterKey: config?.data?.cashRegisterKey || "",
    }
  })

  const saveConfigMutation = useMutation({
    mutationFn: async (data: OneCFormData) => {
      return apiRequest('POST', '/api/onec/config', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onec/config'] })
      queryClient.invalidateQueries({ queryKey: ['/api/onec/stats'] })
      toast({
        title: "Настройки сохранены",
        description: "Параметры подключения к 1С Розница обновлены",
      })
      setIsOpen(false)
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить настройки 1С Розница",
        variant: "destructive",
      })
    }
  })

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/onec/test-connection')
    },
    onSuccess: (data: any) => {
      toast({
        title: "Подключение успешно",
        description: data?.message || "Подключение к 1С Розница установлено",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка подключения",
        description: error.message || "Не удалось подключиться к 1С Розница",
        variant: "destructive",
      })
    }
  })

  const syncProductsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/onec/products/sync')
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/onec/stats'] })
      toast({
        title: "Синхронизация товаров завершена",
        description: `Загружено: ${data?.imported || 0} товаров из 1С Розница`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка синхронизации товаров",
        description: error.message || "Не удалось синхронизировать товары с 1С Розница",
        variant: "destructive",
      })
    }
  })

  const syncServicesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/onec/services/sync')
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/onec/stats'] })
      toast({
        title: "Синхронизация услуг завершена",
        description: `Загружено: ${data?.imported || 0} услуг из 1С Розница`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка синхронизации услуг",
        description: error.message || "Не удалось синхронизировать услуги с 1С Розница",
        variant: "destructive",
      })
    }
  })

  const isConfigured = config?.data?.baseUrl && config?.data?.username

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              1С Розница
              {isConfigured ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Настроена
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Не настроена
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Интеграция с 1С Розница для синхронизации товаров и услуг
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-configure-onec">
                <Settings className="h-4 w-4 mr-2" />
                Настроить
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Настройка 1С Розница</DialogTitle>
                <DialogDescription>
                  Введите параметры подключения к 1С Розница
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => saveConfigMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="http://server:port/accounting/odata/standard.odata/"
                            data-testid="input-onec-baseurl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имя пользователя</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Введите имя пользователя"
                            data-testid="input-onec-username"
                          />
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
                              data-testid="input-onec-password"
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
                    name="organizationKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ключ организации</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Введите ключ организации"
                            data-testid="input-onec-orgkey"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cashRegisterKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ключ кассы</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Введите ключ кассы"
                            data-testid="input-onec-cashkey"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => testConnectionMutation.mutate()}
                      disabled={testConnectionMutation.isPending}
                      className="flex-1"
                      data-testid="button-test-onec"
                    >
                      {testConnectionMutation.isPending ? "Проверка..." : "Тест"}
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveConfigMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-onec"
                    >
                      {saveConfigMutation.isPending ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      {isConfigured && (
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>URL: {config.data.baseUrl}</p>
            <p>Пользователь: {config.data.username}</p>
            {stats && (
              <div className="mt-2">
                <p>Товаров: {stats.products || 0}</p>
                <p>Услуг: {stats.services || 0}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncProductsMutation.mutate()}
              disabled={syncProductsMutation.isPending}
              data-testid="button-sync-products"
            >
              {syncProductsMutation.isPending ? "Синхронизация..." : "Синхронизировать товары"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncServicesMutation.mutate()}
              disabled={syncServicesMutation.isPending}
              data-testid="button-sync-services"
            >
              {syncServicesMutation.isPending ? "Синхронизация..." : "Синхронизировать услуги"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function EmailIntegrationCard() {
  const [isOpen, setIsOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()

  const { data: integration, isLoading } = useQuery<IntegrationCredential>({
    queryKey: ['/api/integration-credentials/email'],
  })

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      smtpHost: integration?.credentials?.smtpHost || "",
      smtpPort: integration?.credentials?.smtpPort || "587",
      smtpUsername: integration?.credentials?.smtpUsername || "",
      smtpPassword: integration?.credentials?.smtpPassword || "",
      fromEmail: integration?.credentials?.fromEmail || "",
      fromName: integration?.credentials?.fromName || "",
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      return apiRequest('PUT', '/api/integration-credentials/email', {
        credentials: data,
        isEnabled: true
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integration-credentials/email'] })
      toast({
        title: "Настройки сохранены",
        description: "Email интеграция успешно настроена",
      })
      setIsOpen(false)
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить настройки",
        variant: "destructive",
      })
    }
  })

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/integration-credentials/email/test')
    },
    onSuccess: () => {
      toast({
        title: "Подключение успешно",
        description: "Email сервер доступен",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка подключения",
        description: error.message || "Не удалось подключиться к Email серверу",
        variant: "destructive",
      })
    }
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Email (SMTP)
              {integration?.isEnabled ? (
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
            <CardDescription>
              Настройка SMTP сервера для отправки email уведомлений
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-configure-email">
                <Settings className="h-4 w-4 mr-2" />
                Настроить
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Настройка Email (SMTP)</DialogTitle>
                <DialogDescription>
                  Введите параметры подключения к вашему SMTP серверу
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="smtpHost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Хост</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="smtp.example.com"
                            data-testid="input-smtp-host"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Порт</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="587"
                            data-testid="input-smtp-port"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имя пользователя</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="user@example.com"
                            data-testid="input-smtp-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пароль</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Введите пароль"
                              data-testid="input-smtp-password"
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
                    name="fromEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email отправителя</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="noreply@example.com"
                            data-testid="input-from-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имя отправителя (необязательно)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ветеринарная клиника"
                            data-testid="input-from-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => testConnectionMutation.mutate()}
                      disabled={testConnectionMutation.isPending}
                      className="flex-1"
                      data-testid="button-test-email"
                    >
                      {testConnectionMutation.isPending ? "Проверка..." : "Тест соединения"}
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-email"
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
      {integration?.isEnabled && (
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>SMTP: {integration.credentials.smtpHost}:{integration.credentials.smtpPort}</p>
            <p>От: {integration.credentials.fromEmail}</p>
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
        <OneCIntegrationCard />
        <GalenIntegrationCard />
        <SmsRuIntegrationCard />
        <EmailIntegrationCard />
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
          <p>• ГИС ВетИС Гален требует регистрацию в системе и получение учетных данных</p>
        </CardContent>
      </Card>
    </div>
  )
}
