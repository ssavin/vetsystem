import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, Clock, Users, Video } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const demoFormSchema = z.object({
  fullName: z.string().min(2, "Введите имя и фамилию"),
  clinicName: z.string().min(2, "Введите название клиники"),
  phone: z.string().min(10, "Введите корректный номер телефона"),
  email: z.string().email("Введите корректный email"),
  city: z.string().optional(),
  branchCount: z.string().optional(),
  currentSystem: z.string().optional(),
  comment: z.string().optional(),
  consent: z.boolean().refine(val => val === true, "Необходимо согласие на обработку данных"),
})

type DemoFormValues = z.infer<typeof demoFormSchema>

const benefits = [
  {
    icon: Video,
    title: "Онлайн-демонстрация",
    description: "Покажем систему через Zoom или Google Meet"
  },
  {
    icon: Clock,
    title: "30-60 минут",
    description: "Полный обзор функционала под ваши задачи"
  },
  {
    icon: Users,
    title: "Персональный подход",
    description: "Ответим на все ваши вопросы"
  },
  {
    icon: CheckCircle2,
    title: "Бесплатная консультация",
    description: "Подберём оптимальное решение"
  },
]

export default function LandingDemo() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()

  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: {
      fullName: "",
      clinicName: "",
      phone: "",
      email: "",
      city: "",
      branchCount: "",
      currentSystem: "",
      comment: "",
      consent: false,
    },
  })

  const onSubmit = async (data: DemoFormValues) => {
    try {
      const response = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        setIsSubmitted(true)
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось отправить заявку. Попробуйте позже.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку. Попробуйте позже.",
        variant: "destructive",
      })
    }
  }

  if (isSubmitted) {
    return (
      <div className="py-20 md:py-32">
        <div className="container max-w-lg">
          <Card className="text-center p-8">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-6" />
            <CardTitle className="text-2xl mb-4">Заявка отправлена!</CardTitle>
            <CardDescription className="text-base">
              Спасибо за интерес к VetSystemAI. Мы свяжемся с вами в течение 24 часов 
              для согласования времени демонстрации.
            </CardDescription>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12 md:py-20">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Запросить демонстрацию</h1>
          <p className="text-xl text-muted-foreground">
            Заполните форму и мы покажем, как VetSystemAI может помочь вашей клинике
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefits.map((benefit) => (
                <Card key={benefit.title}>
                  <CardHeader className="pb-2">
                    <benefit.icon className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-base">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{benefit.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Что вы получите на демо?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm">Полный обзор всех модулей системы</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm">Демонстрацию под ваши конкретные задачи</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm">Ответы на все технические вопросы</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm">Расчёт стоимости для вашей клиники</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm">План внедрения и миграции данных</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Заполните форму</CardTitle>
              <CardDescription>Мы свяжемся с вами в течение 24 часов</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имя и фамилия *</FormLabel>
                        <FormControl>
                          <Input placeholder="Иван Иванов" {...field} data-testid="input-fullName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clinicName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название клиники *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ветеринарная клиника" {...field} data-testid="input-clinicName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Телефон *</FormLabel>
                          <FormControl>
                            <Input placeholder="+7 (999) 123-45-67" {...field} data-testid="input-phone" />
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
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input placeholder="email@clinic.ru" type="email" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Город</FormLabel>
                        <FormControl>
                          <Input placeholder="Москва" {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="branchCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Количество филиалов</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-branchCount">
                                <SelectValue placeholder="Выберите" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 филиал</SelectItem>
                              <SelectItem value="2-3">2-3 филиала</SelectItem>
                              <SelectItem value="4-10">4-10 филиалов</SelectItem>
                              <SelectItem value="10+">Более 10</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currentSystem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Текущая система</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-currentSystem">
                                <SelectValue placeholder="Выберите" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Нет системы</SelectItem>
                              <SelectItem value="excel">Excel/таблицы</SelectItem>
                              <SelectItem value="vetais">Vetais</SelectItem>
                              <SelectItem value="other">Другая система</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Комментарий</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Расскажите о ваших потребностях" 
                            className="resize-none"
                            {...field} 
                            data-testid="textarea-comment"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consent"
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
                          <FormLabel className="text-sm font-normal">
                            Я согласен на обработку персональных данных
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting} data-testid="button-submit-demo">
                    {form.formState.isSubmitting ? "Отправка..." : "Отправить заявку"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
