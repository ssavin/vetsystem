import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertLegalEntitySchema, type LegalEntity } from "@shared/schema"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Building2,
  CheckCircle,
  XCircle,
  FileText,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Award,
} from "lucide-react"

type LegalEntityFormData = z.infer<typeof insertLegalEntitySchema>

export default function LegalEntities() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingEntity, setEditingEntity] = useState<LegalEntity | null>(null)
  const { toast } = useToast()

  // Fetch legal entities
  const { data: entities = [], isLoading } = useQuery<LegalEntity[]>({
    queryKey: ['/api/legal-entities'],
  })

  const form = useForm<LegalEntityFormData>({
    resolver: zodResolver(insertLegalEntitySchema),
    defaultValues: {
      legalName: "",
      shortName: "",
      inn: "",
      kpp: "",
      ogrn: "",
      legalAddress: "",
      actualAddress: "",
      phone: "",
      email: "",
      bankName: "",
      bik: "",
      correspondentAccount: "",
      paymentAccount: "",
      veterinaryLicenseNumber: "",
      veterinaryLicenseIssueDate: undefined,
      directorName: "",
      isActive: true,
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: LegalEntityFormData) => {
      return apiRequest('POST', '/api/legal-entities', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/legal-entities'] })
      queryClient.invalidateQueries({ queryKey: ['/api/legal-entities/active'] })
      toast({
        title: "Успешно!",
        description: "Юридическое лицо создано",
      })
      setIsCreateDialogOpen(false)
      form.reset()
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать юридическое лицо",
        variant: "destructive",
      })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LegalEntityFormData> }) => {
      return apiRequest('PUT', `/api/legal-entities/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/legal-entities'] })
      queryClient.invalidateQueries({ queryKey: ['/api/legal-entities/active'] })
      toast({
        title: "Успешно!",
        description: "Юридическое лицо обновлено",
      })
      setEditingEntity(null)
      form.reset()
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить юридическое лицо",
        variant: "destructive",
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/legal-entities/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/legal-entities'] })
      queryClient.invalidateQueries({ queryKey: ['/api/legal-entities/active'] })
      toast({
        title: "Успешно!",
        description: "Юридическое лицо удалено",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить юридическое лицо",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: LegalEntityFormData) => {
    if (editingEntity) {
      updateMutation.mutate({ id: editingEntity.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (entity: LegalEntity) => {
    setEditingEntity(entity)
    form.reset({
      legalName: entity.legalName,
      shortName: entity.shortName || "",
      inn: entity.inn,
      kpp: entity.kpp || "",
      ogrn: entity.ogrn,
      legalAddress: entity.legalAddress,
      actualAddress: entity.actualAddress || "",
      phone: entity.phone || "",
      email: entity.email || "",
      bankName: entity.bankName || "",
      bik: entity.bik || "",
      correspondentAccount: entity.correspondentAccount || "",
      paymentAccount: entity.paymentAccount || "",
      veterinaryLicenseNumber: entity.veterinaryLicenseNumber || "",
      veterinaryLicenseIssueDate: entity.veterinaryLicenseIssueDate ? new Date(entity.veterinaryLicenseIssueDate) : undefined,
      directorName: entity.directorName || "",
      isActive: entity.isActive,
    })
  }

  const handleDelete = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить это юридическое лицо?")) {
      deleteMutation.mutate(id)
    }
  }

  const resetForm = () => {
    setEditingEntity(null)
    form.reset()
    setIsCreateDialogOpen(false)
  }

  // Filter entities
  const filteredEntities = entities.filter(entity =>
    entity.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entity.shortName && entity.shortName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    entity.inn.includes(searchTerm) ||
    (entity.ogrn && entity.ogrn.includes(searchTerm))
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-legal-entities-title">
            Юридические лица
          </h1>
          <p className="text-muted-foreground">
            Управление юридическими лицами организации
          </p>
        </div>
        <Dialog 
          open={isCreateDialogOpen || !!editingEntity} 
          onOpenChange={(open) => {
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-legal-entity">
              <Plus className="h-4 w-4 mr-2" />
              Добавить юр. лицо
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto" data-testid="dialog-legal-entity-form">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-primary" />
                {editingEntity ? 'Редактировать юридическое лицо' : 'Новое юридическое лицо'}
              </DialogTitle>
              <DialogDescription>
                {editingEntity ? 'Изменение реквизитов юридического лица' : 'Добавление нового юридического лица'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Основная информация */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Основная информация
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="legalName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Полное наименование *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder='ООО "Ветеринарная клиника Алиса"' 
                            {...field}
                            data-testid="input-legal-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shortName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Краткое наименование</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder='ООО "Алиса"' 
                            {...field}
                            data-testid="input-short-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="directorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Руководитель</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Иванов Иван Иванович" 
                            {...field}
                            data-testid="input-director-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Реквизиты */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Реквизиты
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="inn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ИНН *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="1234567890" 
                              {...field}
                              data-testid="input-inn"
                              maxLength={12}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="kpp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>КПП</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123456789" 
                              {...field}
                              data-testid="input-kpp"
                              maxLength={9}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ogrn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ОГРН *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="1234567890123" 
                              {...field}
                              data-testid="input-ogrn"
                              maxLength={15}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Адреса */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Адреса
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="legalAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Юридический адрес *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="г. Москва, ул. Примерная, д. 1, офис 100" 
                            {...field}
                            data-testid="input-legal-address"
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actualAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Фактический адрес</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Если отличается от юридического" 
                            {...field}
                            data-testid="input-actual-address"
                            rows={2}
                          />
                        </FormControl>
                        <FormDescription>
                          Оставьте пустым, если совпадает с юридическим
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Контакты */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Контакты
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Телефон</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+7 (495) 123-45-67" 
                              {...field}
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="info@clinic.ru" 
                              {...field}
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Банковские реквизиты */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Банковские реквизиты
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Наименование банка</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ПАО Сбербанк" 
                            {...field}
                            data-testid="input-bank-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bik"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>БИК</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="044525225" 
                              {...field}
                              data-testid="input-bik"
                              maxLength={9}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="correspondentAccount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Корр. счёт</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="30101810400000000225" 
                              {...field}
                              data-testid="input-correspondent-account"
                              maxLength={20}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="paymentAccount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Расчётный счёт</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="40702810138000000001" 
                            {...field}
                            data-testid="input-payment-account"
                            maxLength={20}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Ветеринарная лицензия */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Ветеринарная лицензия
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="veterinaryLicenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Номер лицензии</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="77.01.01.001.Л.000001.01.23" 
                              {...field}
                              data-testid="input-veterinary-license-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="veterinaryLicenseIssueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дата выдачи</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field}
                              value={field.value ? (field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value) : ""}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                              data-testid="input-veterinary-license-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Статус */}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Активное</FormLabel>
                        <FormDescription>
                          Доступно для выбора в настройках клиники и филиалов
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    data-testid="button-cancel"
                  >
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save"
                  >
                    {createMutation.isPending || updateMutation.isPending 
                      ? "Сохранение..." 
                      : editingEntity ? "Обновить" : "Создать"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Поиск по наименованию, ИНН или ОГРН..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </CardContent>
      </Card>

      {/* Entities List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredEntities.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Юридические лица не найдены</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Попробуйте изменить условия поиска" : "Создайте первое юридическое лицо"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first">
                <Plus className="h-4 w-4 mr-2" />
                Создать юр. лицо
              </Button>
            )}
          </div>
        ) : (
          filteredEntities.map((entity) => (
            <Card key={entity.id} className="hover-elevate" data-testid={`card-legal-entity-${entity.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className={`h-5 w-5 ${entity.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                    <CardTitle className="text-lg">{entity.shortName || entity.legalName}</CardTitle>
                  </div>
                  <Badge variant={entity.isActive ? "default" : "secondary"} className="gap-1">
                    {entity.isActive ? (
                      <><CheckCircle className="h-3 w-3" />Активное</>
                    ) : (
                      <><XCircle className="h-3 w-3" />Неактивное</>
                    )}
                  </Badge>
                </div>
                {entity.shortName && (
                  <CardDescription className="text-sm">
                    {entity.legalName}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>ИНН: {entity.inn}</span>
                  </div>
                  {entity.kpp && (
                    <div className="flex items-center text-muted-foreground">
                      <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>КПП: {entity.kpp}</span>
                    </div>
                  )}
                  <div className="flex items-center text-muted-foreground">
                    <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>ОГРН: {entity.ogrn}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="break-words">{entity.legalAddress}</span>
                  </div>
                  {entity.phone && (
                    <div className="flex items-center text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{entity.phone}</span>
                    </div>
                  )}
                  {entity.email && (
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="break-all">{entity.email}</span>
                    </div>
                  )}
                </div>

                {entity.veterinaryLicenseNumber && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Award className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>Лицензия: {entity.veterinaryLicenseNumber}</span>
                      </div>
                      {entity.veterinaryLicenseIssueDate && (
                        <div className="text-xs text-muted-foreground ml-6 mt-1">
                          от {new Date(entity.veterinaryLicenseIssueDate).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex justify-between items-center pt-2">
                  {entity.directorName && (
                    <div className="text-xs text-muted-foreground">
                      Руководитель: {entity.directorName}
                    </div>
                  )}
                  <div className="flex space-x-1 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(entity)}
                      data-testid={`button-edit-${entity.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(entity.id)}
                      data-testid={`button-delete-${entity.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
