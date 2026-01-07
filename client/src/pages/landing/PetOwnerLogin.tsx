import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Smartphone, PawPrint, Calendar, FileText, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import logoPath from "@assets/logo_1759553178604.png"

const phoneSchema = z.object({
  phone: z.string().min(10, "Введите корректный номер телефона"),
})

const codeSchema = z.object({
  code: z.string().length(4, "Введите 4-значный код"),
})

const features = [
  { icon: PawPrint, title: "Профили питомцев", description: "Вся информация о ваших любимцах в одном месте" },
  { icon: Calendar, title: "Запись на приём", description: "Записывайтесь к врачу онлайн в любое время" },
  { icon: FileText, title: "Документы", description: "Доступ к медицинским документам и истории визитов" },
]

export default function PetOwnerLogin() {
  const [step, setStep] = useState<"phone" | "code">("phone")
  const [phone, setPhone] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  })

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  })

  const handleSendCode = async (data: z.infer<typeof phoneSchema>) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/mobile/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.phone }),
      })

      if (response.ok) {
        setPhone(data.phone)
        setStep("code")
        toast({
          title: "Код отправлен",
          description: "Проверьте SMS на вашем телефоне",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Ошибка",
          description: error.message || "Не удалось отправить код",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить код. Попробуйте позже.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (data: z.infer<typeof codeSchema>) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/mobile/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: data.code }),
      })

      if (response.ok) {
        const result = await response.json()
        localStorage.setItem("petOwnerToken", result.token)
        window.location.href = "/pet-owners/my-pets"
      } else {
        const error = await response.json()
        toast({
          title: "Ошибка",
          description: error.message || "Неверный код",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось войти. Попробуйте позже.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] py-12 md:py-20">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className="space-y-8">
            <div>
              <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                На главную
              </Link>
              <h1 className="text-3xl font-bold mb-4">Личный кабинет владельца</h1>
              <p className="text-muted-foreground">
                Войдите, чтобы управлять записями на приём, просматривать историю визитов 
                и получать доступ к медицинским документам ваших питомцев.
              </p>
            </div>

            <div className="space-y-4">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Мобильное приложение:</strong> Скачайте наше приложение для 
                удобного доступа ко всем функциям с телефона.
              </p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm">App Store</Button>
                <Button variant="outline" size="sm">Google Play</Button>
              </div>
            </div>
          </div>

          <div>
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <img src={logoPath} alt="VetSystemAI" className="h-12 w-12 rounded" />
                </div>
                <CardTitle>
                  {step === "phone" ? "Вход в личный кабинет" : "Введите код"}
                </CardTitle>
                <CardDescription>
                  {step === "phone" 
                    ? "Введите номер телефона, который вы указывали в клинике" 
                    : `Мы отправили SMS-код на номер ${phone}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {step === "phone" ? (
                  <Form {...phoneForm}>
                    <form onSubmit={phoneForm.handleSubmit(handleSendCode)} className="space-y-4">
                      <FormField
                        control={phoneForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Номер телефона</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="+7 (999) 123-45-67" 
                                {...field} 
                                data-testid="input-pet-owner-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                        data-testid="button-send-code"
                      >
                        {isLoading ? "Отправка..." : "Получить код"}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <Form {...codeForm}>
                    <form onSubmit={codeForm.handleSubmit(handleVerifyCode)} className="space-y-4">
                      <FormField
                        control={codeForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem className="flex flex-col items-center">
                            <FormLabel>Код из SMS</FormLabel>
                            <FormControl>
                              <InputOTP 
                                maxLength={4} 
                                value={field.value}
                                onChange={field.onChange}
                                data-testid="input-otp-code"
                              >
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                  <InputOTPSlot index={3} />
                                </InputOTPGroup>
                              </InputOTP>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                        data-testid="button-verify-code"
                      >
                        {isLoading ? "Проверка..." : "Войти"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => setStep("phone")}
                      >
                        Изменить номер
                      </Button>
                    </form>
                  </Form>
                )}

                <p className="text-xs text-center text-muted-foreground mt-4">
                  Если ваш номер не зарегистрирован в системе, обратитесь в клинику.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
