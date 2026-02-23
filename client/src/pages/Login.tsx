import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { useLocation } from "wouter"
import { Eye, EyeOff, MapPin, ArrowLeft, Building2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import logoPath from "@assets/logo_1759553178604.png"

const credentialsSchema = z.object({
  username: z.string().min(1, "Введите имя пользователя"),
  password: z.string().min(1, "Введите пароль"),
})

type CredentialsValues = z.infer<typeof credentialsSchema>

type BranchInfo = {
  id: string;
  name: string;
  city: string;
  address: string;
}

type Step = 'credentials' | 'branch';

export default function Login() {
  const [, navigate] = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<Step>('credentials')
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [tenantName, setTenantName] = useState('')
  const [validatedCredentials, setValidatedCredentials] = useState<{ username: string; password: string } | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const { login, isLoading } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation('auth')

  const form = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onValidateCredentials = async (values: CredentialsValues) => {
    setIsValidating(true)
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: values.username, password: values.password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('login.invalidCredentials'))
      }

      const data = await response.json()
      setValidatedCredentials(values)
      setBranches(data.branches || [])
      setTenantName(data.tenantName || '')

      if (data.branches?.length === 1) {
        await handleBranchSelect(data.branches[0].id, values)
      } else {
        setStep('branch')
      }
    } catch (error) {
      toast({
        title: t('login.error'),
        description: error instanceof Error ? error.message : t('login.invalidCredentials'),
        variant: "destructive",
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleBranchSelect = async (branchId: string, creds?: { username: string; password: string }) => {
    const credentials = creds || validatedCredentials
    if (!credentials) return

    try {
      await login(credentials.username, credentials.password, branchId)
      toast({
        title: t('login.success'),
        description: t('login.welcomeMessage'),
      })
      navigate("/")
    } catch (error) {
      toast({
        title: t('login.error'),
        description: error instanceof Error ? error.message : t('login.invalidCredentials'),
        variant: "destructive",
      })
    }
  }

  const goBack = () => {
    setStep('credentials')
    setBranches([])
    setTenantName('')
    setValidatedCredentials(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <img src={logoPath} alt="VetSystem" className="w-20 h-20 rounded-lg" />
          </div>
          <CardTitle className="text-2xl text-center">{t('login.title')}</CardTitle>
          <CardDescription className="text-center">
            {step === 'credentials'
              ? t('login.subtitle')
              : `${tenantName} — выберите филиал`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'credentials' && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onValidateCredentials)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('login.username')}</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder={t('login.usernamePlaceholder')}
                          autoComplete="username"
                          data-testid="input-username"
                          {...field}
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
                      <FormLabel>{t('login.password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={t('login.passwordPlaceholder')}
                            autoComplete="current-password"
                            data-testid="input-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isValidating}
                  data-testid="button-login"
                >
                  {isValidating ? "Проверка..." : t('login.loginButton')}
                </Button>
              </form>
            </Form>
          )}

          {step === 'branch' && (
            <div className="space-y-3">
              <div className="space-y-2">
                {branches.map((branch) => (
                  <Button
                    key={branch.id}
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-3"
                    disabled={isLoading}
                    onClick={() => handleBranchSelect(branch.id)}
                  >
                    <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col items-start text-left">
                      <span className="font-medium">{branch.name}</span>
                      {(branch.city || branch.address) && (
                        <span className="text-xs text-muted-foreground">
                          {[branch.city, branch.address].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
              
              <Button
                variant="ghost"
                className="w-full gap-2"
                onClick={goBack}
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('login.contactAdmin')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
