import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { Save, X } from "lucide-react"

const ownerFormSchema = z.object({
  name: z.string().min(1, "Введите имя клиента"),
  phone: z.string().min(1, "Введите телефон"),
  email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  passportSeries: z.string().regex(/^\d{4}$/, "Серия паспорта должна состоять из 4 цифр").or(z.literal("")).optional(),
  passportNumber: z.string().regex(/^\d{6}$/, "Номер паспорта должен состоять из 6 цифр").or(z.literal("")).optional(),
  passportIssuedBy: z.string().optional(),
  passportIssueDate: z.string().optional(),
  registrationAddress: z.string().optional(),
  residenceAddress: z.string().optional(),
  personalDataConsentGiven: z.boolean().default(false),
  personalDataConsentDate: z.string().optional(),
})

type OwnerFormData = z.infer<typeof ownerFormSchema>

interface OwnerRegistrationFormProps {
  owner?: {
    id: string
    name: string
    phone?: string
    email?: string
    address?: string
    dateOfBirth?: Date
    gender?: string
    passportSeries?: string
    passportNumber?: string
    passportIssuedBy?: string
    passportIssueDate?: Date
    registrationAddress?: string
    residenceAddress?: string
    personalDataConsentGiven?: boolean
    personalDataConsentDate?: Date
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export default function OwnerRegistrationForm({ owner, onSuccess, onCancel }: OwnerRegistrationFormProps) {
  const { toast } = useToast()
  const isEditing = !!owner

  const form = useForm<OwnerFormData>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: {
      name: owner?.name || "",
      phone: owner?.phone || "",
      email: owner?.email || "",
      address: owner?.address || "",
      dateOfBirth: owner?.dateOfBirth ? new Date(owner.dateOfBirth).toISOString().split('T')[0] : undefined,
      gender: owner?.gender || "",
      passportSeries: owner?.passportSeries || "",
      passportNumber: owner?.passportNumber || "",
      passportIssuedBy: owner?.passportIssuedBy || "",
      passportIssueDate: owner?.passportIssueDate ? new Date(owner.passportIssueDate).toISOString().split('T')[0] : undefined,
      registrationAddress: owner?.registrationAddress || "",
      residenceAddress: owner?.residenceAddress || "",
      personalDataConsentGiven: owner?.personalDataConsentGiven || false,
      personalDataConsentDate: owner?.personalDataConsentDate ? new Date(owner.personalDataConsentDate).toISOString().split('T')[0] : undefined,
    },
  })

  const saveOwnerMutation = useMutation({
    mutationFn: async (data: OwnerFormData) => {
      if (isEditing) {
        return await apiRequest('PUT', `/api/owners/${owner.id}`, data)
      } else {
        return await apiRequest('POST', '/api/owners', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/owners'] })
      toast({
        title: "Успешно",
        description: isEditing ? "Клиент обновлен" : "Клиент добавлен",
      })
      form.reset()
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || (isEditing ? "Не удалось обновить клиента" : "Не удалось добавить клиента"),
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: OwnerFormData) => {
    saveOwnerMutation.mutate(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Редактирование клиента" : "Регистрация клиента"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя клиента *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Иванов Иван Иванович" 
                        {...field} 
                        data-testid="input-owner-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Телефон *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+7 (999) 123-45-67" 
                        {...field} 
                        data-testid="input-owner-phone"
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
                        placeholder="email@example.com" 
                        {...field} 
                        data-testid="input-owner-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Адрес</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Улица, дом, квартира" 
                        {...field} 
                        data-testid="input-owner-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Личные данные */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Личные данные</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата рождения</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-date-of-birth"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Пол</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder="Выберите пол" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Мужской</SelectItem>
                          <SelectItem value="female">Женский</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Паспортные данные */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Паспортные данные</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="passportSeries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Серия паспорта</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="1234" 
                          maxLength={4}
                          {...field} 
                          data-testid="input-passport-series"
                        />
                      </FormControl>
                      <FormDescription>4 цифры</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passportNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Номер паспорта</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123456" 
                          maxLength={6}
                          {...field} 
                          data-testid="input-passport-number"
                        />
                      </FormControl>
                      <FormDescription>6 цифр</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passportIssuedBy"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Кем выдан</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Отделение УФМС России" 
                          {...field} 
                          data-testid="input-passport-issued-by"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passportIssueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата выдачи</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-passport-issue-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Адреса */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Адреса</h3>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="registrationAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Адрес регистрации (прописка)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Город, улица, дом, квартира" 
                          {...field} 
                          data-testid="input-registration-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="residenceAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Адрес проживания (фактический)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Город, улица, дом, квартира" 
                          {...field} 
                          data-testid="input-residence-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Согласие на обработку ПД */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Согласие на обработку персональных данных (ФЗ-152)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="personalDataConsentGiven"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-consent"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Согласие получено
                        </FormLabel>
                        <FormDescription>
                          Клиент подтвердил согласие на обработку персональных данных
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personalDataConsentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата подписания согласия</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-consent-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  data-testid="button-cancel-owner"
                >
                  <X className="h-4 w-4 mr-2" />
                  Отмена
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={saveOwnerMutation.isPending}
                data-testid="button-save-owner"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveOwnerMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
