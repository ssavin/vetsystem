import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema } from "@shared/schema"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { useLocation } from "wouter"
import { LogIn, Eye, EyeOff, MapPin } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import logoPath from "@assets/logo_1759553178604.png"

type Branch = {
  id: string;
  name: string;
  city: string;
  address: string;
}

type LoginFormValues = z.infer<typeof loginSchema>

export default function Login() {
  const [, navigate] = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuth()
  const { toast } = useToast()
  
  // Fetch available branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['/api/branches/active'],
    queryFn: () => fetch('/api/branches/active').then(res => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      branchId: "",
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.username, values.password, values.branchId)
      toast({
        title: "Успешно",
        description: "Добро пожаловать в VetSystem!",
      })
      navigate("/")
    } catch (error) {
      toast({
        title: "Ошибка входа",
        description: error instanceof Error ? error.message : "Неверные данные для входа",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <img src={logoPath} alt="VetSystem" className="w-20 h-20 rounded-lg" />
          </div>
          <CardTitle className="text-2xl text-center">VetSystem</CardTitle>
          <CardDescription className="text-center">
            Войдите в систему управления ветеринарной клиникой
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя пользователя</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Введите имя пользователя"
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
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Введите пароль"
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

              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Филиал клиники
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={branchesLoading}>
                      <FormControl>
                        <SelectTrigger data-testid="select-branch">
                          <SelectValue placeholder={branchesLoading ? "Загрузка филиалов..." : "Выберите филиал"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((branch: Branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{branch.name}</span>
                              <span className="text-sm text-muted-foreground">{branch.city}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Вход..." : "Войти"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Для получения доступа обратитесь к администратору системы
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}