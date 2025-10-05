import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { Save, X } from "lucide-react"

const ownerFormSchema = z.object({
  name: z.string().min(1, "Введите имя клиента"),
  phone: z.string().min(1, "Введите телефон"),
  email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  address: z.string().optional(),
})

type OwnerFormData = z.infer<typeof ownerFormSchema>

interface OwnerRegistrationFormProps {
  owner?: {
    id: string
    name: string
    phone?: string
    email?: string
    address?: string
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
    },
  })

  const saveOwnerMutation = useMutation({
    mutationFn: async (data: OwnerFormData) => {
      if (isEditing) {
        return await apiRequest(`/api/owners/${owner.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        })
      } else {
        return await apiRequest('/api/owners', {
          method: 'POST',
          body: JSON.stringify(data),
        })
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
