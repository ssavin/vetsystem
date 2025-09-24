import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Settings as SettingsIcon, 
  User as UserIcon, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Printer,
  Mail,
  Phone,
  Save,
  Building2,
  Plus,
  Edit,
  Trash2,
  MapPin,
  CheckCircle,
  AlertCircle,
  XCircle,
  Search,
  Users
} from "lucide-react"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { insertUserSchema, updateUserSchema, User, USER_ROLES, Branch } from "@shared/schema"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

// Form validation schema for branches
const branchSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(255, "Название слишком длинное"),
  address: z.string().min(1, "Адрес обязателен"),
  city: z.string().min(1, "Город обязателен").max(100, "Название города слишком длинное"),
  region: z.string().optional(),
  phone: z.string().min(1, "Телефон обязателен").max(50, "Номер телефона слишком длинный"),
  email: z.string().email("Некорректный email").optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance"]).default("active"),
})

type BranchFormData = z.infer<typeof branchSchema>
type UserFormValues = z.infer<typeof insertUserSchema>

export default function Settings() {
  const [clinicName, setClinicName] = useState("Ветеринарная клиника \"Здоровый питомец\"")
  const [clinicAddress, setClinicAddress] = useState("г. Москва, ул. Примерная, д. 123")
  const [clinicPhone, setClinicPhone] = useState("+7 (499) 123-45-67")
  const [clinicEmail, setClinicEmail] = useState("info@vetclinic.ru")
  
  // Branch management state
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  
  // User management state
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  const { toast } = useToast()
  const userQueryClient = useQueryClient()
  
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    appointments: true,
    lowStock: true,
    overduePayments: true
  })

  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    dataRetention: 365,
    sessionTimeout: 30,
    twoFactorAuth: false
  })

  // Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  })

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  })

  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      region: "",
      phone: "",
      email: "",
      description: "",
      status: "active",
    },
  })

  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      phone: "",
      role: "врач", 
      status: "active",
      branchId: "NONE"
    }
  })

  // Create branch mutation
  const createBranchMutation = useMutation({
    mutationFn: async (data: BranchFormData) => {
      return apiRequest('POST', '/api/branches', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/branches'] })
      queryClient.invalidateQueries({ queryKey: ['/api/branches/active'] })
      toast({
        title: "Успешно!",
        description: "Отделение создано",
      })
      setIsCreateDialogOpen(false)
      form.reset()
    },
    onError: (error: any) => {
      console.error("Error creating branch:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось создать отделение",
        variant: "destructive",
      })
    },
  })

  // Update branch mutation
  const updateBranchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BranchFormData }) => {
      return apiRequest('PUT', `/api/branches/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/branches'] })
      queryClient.invalidateQueries({ queryKey: ['/api/branches/active'] })
      toast({
        title: "Успешно!",
        description: "Отделение обновлено",
      })
      setEditingBranch(null)
      form.reset()
    },
    onError: (error: any) => {
      console.error("Error updating branch:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось обновить отделение",
        variant: "destructive",
      })
    },
  })

  // Delete branch mutation
  const deleteBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/branches/${id}`, undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/branches'] })
      queryClient.invalidateQueries({ queryKey: ['/api/branches/active'] })
      toast({
        title: "Успешно!",
        description: "Отделение удалено",
      })
    },
    onError: (error: any) => {
      console.error("Error deleting branch:", error)
      toast({
        title: "Ошибка", 
        description: "Не удалось удалить отделение",
        variant: "destructive",
      })
    },
  })

  // User management mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Failed to create user')
      return response.json()
    },
    onSuccess: () => {
      userQueryClient.invalidateQueries({ queryKey: ['/api/users'] })
      toast({ title: "Успех", description: "Пользователь создан" })
      setIsCreateUserDialogOpen(false)
      userForm.reset()
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string, data: UserFormValues }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Failed to update user')
      return response.json()
    },
    onSuccess: () => {
      userQueryClient.invalidateQueries({ queryKey: ['/api/users'] })
      toast({ title: "Успех", description: "Пользователь обновлен" })
      setEditingUser(null)
      userForm.reset()
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete user')
    },
    onSuccess: () => {
      userQueryClient.invalidateQueries({ queryKey: ['/api/users'] })
      toast({ title: "Успех", description: "Пользователь удален" })
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  const saveSettings = () => {
    console.log("Saving settings:", { 
      clinic: { clinicName, clinicAddress, clinicPhone, clinicEmail },
      notifications,
      system: systemSettings
    })
  }

  const onSubmit = (data: BranchFormData) => {
    if (editingBranch) {
      updateBranchMutation.mutate({ id: editingBranch.id, data })
    } else {
      createBranchMutation.mutate(data)
    }
  }

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch)
    form.reset({
      name: branch.name,
      address: branch.address,
      city: branch.city,
      region: branch.region || "",
      phone: branch.phone,
      email: branch.email || "",
      description: branch.description || "",
      status: branch.status as "active" | "inactive" | "maintenance",
    })
  }

  const handleDelete = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить это отделение?")) {
      deleteBranchMutation.mutate(id)
    }
  }

  const resetForm = () => {
    setEditingBranch(null)
    form.reset()
    setIsCreateDialogOpen(false)
  }

  // Filter branches based on search
  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Активное</Badge>
      case 'inactive':
        return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Неактивное</Badge>
      case 'maintenance':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Техобслуживание</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // User form handlers
  const onUserSubmit = (values: UserFormValues) => {
    if (editingUser) {
      // For updates, password is optional but if provided must be valid
      if (values.password && values.password.trim() !== '') {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
        if (values.password.length < 10 || !passwordRegex.test(values.password)) {
          userForm.setError('password', {
            type: 'manual',
            message: 'Пароль должен содержать: строчные буквы (a-z), заглавные буквы (A-Z), цифры (0-9) и специальные символы (@$!%*?&)'
          });
          return;
        }
      }
      
      // For updates, exclude empty password to prevent overwriting
      const updateData = { ...values } as Partial<UserFormValues>;
      if (!updateData.password || updateData.password.trim() === '') {
        delete (updateData as any).password;
      }
      
      // Normalize 'NONE' or empty branchId to null for API
      if (updateData.branchId === 'NONE' || updateData.branchId === '' || !updateData.branchId) {
        updateData.branchId = null;
      }
      
      updateUserMutation.mutate({ userId: editingUser.id, data: updateData as UserFormValues });
    } else {
      // For create, validate password is required and strong
      if (!values.password || values.password.trim() === '') {
        userForm.setError('password', {
          type: 'manual',
          message: 'Пароль обязателен при создании пользователя'
        });
        return;
      }
      
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
      if (values.password.length < 10 || !passwordRegex.test(values.password)) {
        userForm.setError('password', {
          type: 'manual',
          message: 'Пароль должен содержать: строчные буквы (a-z), заглавные буквы (A-Z), цифры (0-9) и специальные символы (@$!%*?&)'
        });
        return;
      }
      
      // Normalize 'NONE' or empty branchId to null for API
      const createData = { ...values };
      if (createData.branchId === 'NONE' || createData.branchId === '' || !createData.branchId) {
        createData.branchId = null;
      }
      
      createUserMutation.mutate(createData);
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    userForm.reset({
      username: user.username,
      password: "", // Don't prefill password for security
      fullName: user.fullName,
      email: user.email || "",
      phone: user.phone || "", 
      role: user.role as any,
      status: user.status as any,
      branchId: user.branchId || "NONE"
    })
    setIsCreateUserDialogOpen(true)
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      deleteUserMutation.mutate(userId)
    }
  }

  const handleCloseUserDialog = () => {
    setIsCreateUserDialogOpen(false)
    setEditingUser(null)
    userForm.reset()
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'руководитель': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'врач': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'администратор': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'менеджер': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      case 'менеджер_склада': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-settings-title">Настройки системы</h1>
        <p className="text-muted-foreground">Конфигурация и управление параметрами VetSystem</p>
      </div>

      {/* Clinic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Информация о клинике
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Название клиники</Label>
              <Input
                id="clinicName"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                data-testid="input-clinic-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicAddress">Адрес</Label>
              <Input
                id="clinicAddress"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                data-testid="input-clinic-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicPhone">Телефон</Label>
              <Input
                id="clinicPhone"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                data-testid="input-clinic-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicEmail">Email</Label>
              <Input
                id="clinicEmail"
                type="email"
                value={clinicEmail}
                onChange={(e) => setClinicEmail(e.target.value)}
                data-testid="input-clinic-email"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Управление отделениями
            </CardTitle>
            <Dialog 
              open={isCreateDialogOpen || !!editingBranch} 
              onOpenChange={(open) => {
                if (!open) resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-branch">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить отделение
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]" data-testid="dialog-branch-form">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2 text-primary" />
                    {editingBranch ? 'Редактировать отделение' : 'Новое отделение'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBranch ? 'Изменение информации об отделении' : 'Добавление нового отделения клиники'}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Название отделения *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Центральная клиника" 
                                {...field}
                                data-testid="input-branch-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Статус</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-branch-status">
                                  <SelectValue placeholder="Выберите статус" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Активное</SelectItem>
                                <SelectItem value="inactive">Неактивное</SelectItem>
                                <SelectItem value="maintenance">Техобслуживание</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Адрес *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="ул. Примерная, д. 123" 
                              {...field}
                              data-testid="input-branch-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Город *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Москва" 
                                {...field}
                                data-testid="input-branch-city"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Регион</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Московская область" 
                                {...field}
                                data-testid="input-branch-region"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Телефон *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="+7 (499) 123-45-67" 
                                {...field}
                                data-testid="input-branch-phone"
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
                                placeholder="branch@vetclinic.ru" 
                                {...field}
                                data-testid="input-branch-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Описание</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Дополнительная информация об отделении..."
                              className="resize-none"
                              rows={3}
                              {...field}
                              data-testid="textarea-branch-description"
                            />
                          </FormControl>
                          <FormDescription>
                            Краткое описание отделения и его особенностей
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={resetForm}
                        data-testid="button-cancel-branch"
                      >
                        Отмена
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createBranchMutation.isPending || updateBranchMutation.isPending}
                        data-testid="button-save-branch"
                      >
                        {createBranchMutation.isPending || updateBranchMutation.isPending 
                          ? "Сохранение..." 
                          : editingBranch ? "Обновить" : "Создать"
                        }
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Поиск отделений по названию, городу или адресу..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-branches"
            />
          </div>

          {/* Branches Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Отделение</TableHead>
                  <TableHead>Город</TableHead>
                  <TableHead>Адрес</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-muted rounded"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-6 bg-muted rounded w-16"></div>
                      </TableCell>
                      <TableCell className="animate-pulse text-right">
                        <div className="h-8 bg-muted rounded w-16 ml-auto"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredBranches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Building2 className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <div className="text-sm text-muted-foreground">
                        {searchTerm ? "Отделения не найдены" : "Нет созданных отделений"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBranches.map((branch) => (
                    <TableRow key={branch.id} className="hover-elevate" data-testid={`row-branch-${branch.id}`}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>{branch.city}</TableCell>
                      <TableCell className="max-w-xs truncate" title={branch.address}>
                        {branch.address}
                      </TableCell>
                      <TableCell>{branch.phone}</TableCell>
                      <TableCell>{getStatusBadge(branch.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(branch)}
                            data-testid={`button-edit-branch-${branch.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(branch.id)}
                            disabled={deleteBranchMutation.isPending}
                            data-testid={`button-delete-branch-${branch.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Statistics */}
          {!branchesLoading && branches.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{branches.length}</div>
                <div className="text-sm text-muted-foreground">Всего отделений</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {branches.filter(b => b.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">Активных</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-500">
                  {branches.filter(b => b.status === 'inactive').length}
                </div>
                <div className="text-sm text-muted-foreground">Неактивных</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Управление пользователями
            </CardTitle>
            <Dialog 
              open={isCreateUserDialogOpen || !!editingUser} 
              onOpenChange={(open) => {
                if (!open) handleCloseUserDialog()
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreateUserDialogOpen(true)} data-testid="button-add-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить пользователя
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" data-testid="dialog-user-form">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    {editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser ? 'Обновить данные сотрудника' : 'Добавьте нового сотрудника в систему'}
                  </DialogDescription>
                </DialogHeader>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
                    <FormField
                      control={userForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Полное имя *</FormLabel>
                          <FormControl>
                            <Input placeholder="Иван Петрович Сидоров" data-testid="input-user-fullname" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Логин *</FormLabel>
                          <FormControl>
                            <Input placeholder="ivan.sidorov" data-testid="input-user-username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Пароль {editingUser ? '' : '*'}</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder={editingUser ? "Оставьте пустым для сохранения текущего" : "Минимум 10 символов, буквы, цифры, символы"} 
                              data-testid="input-user-password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                          {!editingUser && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Пароль должен содержать: заглавные и строчные буквы, цифры и специальные символы (@$!%*?&)
                            </p>
                          )}
                          {editingUser && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Оставьте пустым, чтобы сохранить текущий пароль. Если заполните - минимум 10 символов с буквами, цифрами и символами.
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={userForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="ivan@clinic.ru" data-testid="input-user-email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={userForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Телефон</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+7XXXXXXXXXX" data-testid="input-user-phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={userForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Роль *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-user-role">
                                  <SelectValue placeholder="Выберите роль" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {USER_ROLES.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role === 'менеджер_склада' ? 'менеджер склада' : role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={userForm.control}
                        name="branchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Отделение</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-user-branch">
                                  <SelectValue placeholder="Выберите отделение" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="NONE">Без отделения</SelectItem>
                                {branches.map((branch) => (
                                  <SelectItem key={branch.id} value={branch.id}>
                                    {branch.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCloseUserDialog}
                        data-testid="button-cancel-user"
                      >
                        Отмена
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createUserMutation.isPending || updateUserMutation.isPending}
                        data-testid="button-save-user"
                      >
                        {createUserMutation.isPending || updateUserMutation.isPending 
                          ? "Сохранение..." 
                          : editingUser ? "Обновить" : "Создать"
                        }
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Логин</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Отделение</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Последний вход</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-muted rounded"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-6 bg-muted rounded w-16"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-6 bg-muted rounded w-16"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-20"></div>
                      </TableCell>
                      <TableCell className="animate-pulse text-right">
                        <div className="h-8 bg-muted rounded w-16 ml-auto"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <div className="text-sm text-muted-foreground">
                        Нет созданных пользователей
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="hover-elevate" data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email || '—'}</TableCell>
                      <TableCell>{user.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role === 'менеджер_склада' ? 'менеджер склада' : user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.branchId ? (
                          branches.find(b => b.id === user.branchId)?.name || 'Неизвестно'
                        ) : (
                          <span className="text-muted-foreground">Без отделения</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status === 'active' ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastLogin 
                          ? format(new Date(user.lastLogin), 'dd.MM.yyyy HH:mm', { locale: ru })
                          : '—'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deleteUserMutation.isPending}
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* User Statistics */}
          {!usersLoading && users.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{users.length}</div>
                <div className="text-sm text-muted-foreground">Всего пользователей</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">Активных</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {users.filter(u => u.role === 'врач').length}
                </div>
                <div className="text-sm text-muted-foreground">Врачей</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {users.filter(u => u.role === 'администратор').length}
                </div>
                <div className="text-sm text-muted-foreground">Администраторов</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email уведомления</Label>
                <p className="text-sm text-muted-foreground">
                  Получать уведомления на электронную почту
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, email: checked }))
                }
                data-testid="switch-email-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS уведомления</Label>
                <p className="text-sm text-muted-foreground">
                  Отправлять SMS клиентам
                </p>
              </div>
              <Switch
                checked={notifications.sms}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, sms: checked }))
                }
                data-testid="switch-sms-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Напоминания о записях</Label>
                <p className="text-sm text-muted-foreground">
                  Автоматические напоминания клиентам
                </p>
              </div>
              <Switch
                checked={notifications.appointments}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, appointments: checked }))
                }
                data-testid="switch-appointment-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Низкие остатки на складе</Label>
                <p className="text-sm text-muted-foreground">
                  Уведомления о товарах с низким остатком
                </p>
              </div>
              <Switch
                checked={notifications.lowStock}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, lowStock: checked }))
                }
                data-testid="switch-low-stock-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Просроченные платежи</Label>
                <p className="text-sm text-muted-foreground">
                  Уведомления о просроченных счетах
                </p>
              </div>
              <Switch
                checked={notifications.overduePayments}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, overduePayments: checked }))
                }
                data-testid="switch-overdue-notifications"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Системные настройки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Автоматическое резервное копирование</Label>
                  <p className="text-sm text-muted-foreground">
                    Ежедневное создание резервных копий
                  </p>
                </div>
                <Switch
                  checked={systemSettings.autoBackup}
                  onCheckedChange={(checked) => 
                    setSystemSettings(prev => ({ ...prev, autoBackup: checked }))
                  }
                  data-testid="switch-auto-backup"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataRetention">Хранение данных (дни)</Label>
                <Input
                  id="dataRetention"
                  type="number"
                  value={systemSettings.dataRetention}
                  onChange={(e) => 
                    setSystemSettings(prev => ({ 
                      ...prev, 
                      dataRetention: parseInt(e.target.value) || 365 
                    }))
                  }
                  data-testid="input-data-retention"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Двухфакторная аутентификация</Label>
                  <p className="text-sm text-muted-foreground">
                    Дополнительная защита входа в систему
                  </p>
                </div>
                <Switch
                  checked={systemSettings.twoFactorAuth}
                  onCheckedChange={(checked) => 
                    setSystemSettings(prev => ({ ...prev, twoFactorAuth: checked }))
                  }
                  data-testid="switch-two-factor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Тайм-аут сессии (минуты)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={systemSettings.sessionTimeout}
                  onChange={(e) => 
                    setSystemSettings(prev => ({ 
                      ...prev, 
                      sessionTimeout: parseInt(e.target.value) || 30 
                    }))
                  }
                  data-testid="input-session-timeout"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-16 flex-col gap-2" data-testid="button-database-backup">
              <Database className="h-5 w-5" />
              <span>Резервная копия</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2" data-testid="button-print-settings">
              <Printer className="h-5 w-5" />
              <span>Настройки печати</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2" data-testid="button-email-config">
              <Mail className="h-5 w-5" />
              <span>Настройки email</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2" data-testid="button-sms-config">
              <Phone className="h-5 w-5" />
              <span>Настройки SMS</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} data-testid="button-save-settings">
          <Save className="h-4 w-4 mr-2" />
          Сохранить настройки
        </Button>
      </div>
    </div>
  )
}