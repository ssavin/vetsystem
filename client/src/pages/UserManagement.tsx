import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertUserSchema, updateUserSchema, User, USER_ROLES, Branch } from "@shared/schema"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Users, Shield } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

type UserFormValues = z.infer<typeof insertUserSchema>

export default function UserManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users']
  })

  // Fetch active branches for user assignment
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['/api/branches/active']
  })

  // Create user mutation
  const createMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['/api/users'] })
      toast({ title: "Успех", description: "Пользователь создан" })
      setIsCreateDialogOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  // Update user mutation
  const updateMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['/api/users'] })
      toast({ title: "Успех", description: "Пользователь обновлен" })
      setEditingUser(null)
      form.reset()
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete user')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] })
      toast({ title: "Успех", description: "Пользователь удален" })
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    }
  })

  const form = useForm<UserFormValues>({
    resolver: zodResolver(insertUserSchema), // Use insertUserSchema by default
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

  // Form key to recreate form when switching between create/edit modes
  const formKey = editingUser ? `edit-${editingUser.id}` : 'create';

  const onSubmit = (values: UserFormValues) => {
    if (editingUser) {
      // For updates, password is optional but if provided must be valid
      if (values.password && values.password.trim() !== '') {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
        if (values.password.length < 10 || !passwordRegex.test(values.password)) {
          form.setError('password', {
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
      
      updateMutation.mutate({ userId: editingUser.id, data: updateData as UserFormValues });
    } else {
      // For create, validate password is required and strong
      if (!values.password || values.password.trim() === '') {
        form.setError('password', {
          type: 'manual',
          message: 'Пароль обязателен при создании пользователя'
        });
        return;
      }
      
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
      if (values.password.length < 10 || !passwordRegex.test(values.password)) {
        form.setError('password', {
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
      
      createMutation.mutate(createData);
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.reset({
      username: user.username,
      password: "", // Don't prefill password for security
      fullName: user.fullName,
      email: user.email || "",
      phone: user.phone || "", 
      role: user.role as any,
      status: user.status as any,
      branchId: user.branchId || "NONE"
    })
    setIsCreateDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false)
    setEditingUser(null)
    form.reset()
  }

  const handleDelete = (userId: string) => {
    if (confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      deleteMutation.mutate(userId)
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-user-management-title">
            Управление пользователями
          </h1>
          <p className="text-muted-foreground">
            Создание и управление учетными записями сотрудников системы
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setEditingUser(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <Plus className="h-4 w-4 mr-2" />
              Новый пользователь
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Редактирование пользователя" : "Создание пользователя"}</DialogTitle>
              <DialogDescription>
                {editingUser ? "Обновить данные сотрудника" : "Добавьте нового сотрудника в систему"}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form} key={formKey}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Полное имя *</FormLabel>
                      <FormControl>
                        <Input placeholder="Иван Петрович Сидоров" data-testid="input-fullname" {...field} />
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
                      <FormLabel>Логин *</FormLabel>
                      <FormControl>
                        <Input placeholder="ivan.sidorov" data-testid="input-username-create" {...field} />
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
                      <FormLabel>Пароль {editingUser ? '' : '*'}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={editingUser ? "Оставьте пустым для сохранения текущего" : "Минимум 10 символов, буквы, цифры, символы"} data-testid="input-password-create" {...field} />
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
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="ivan@clinic.ru" data-testid="input-email" {...field} />
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
                      <FormLabel>Телефон</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+7XXXXXXXXXX" data-testid="input-phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Роль *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
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
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Отделение</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-branch">
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
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending} 
                    data-testid="button-save-user"
                  >
                    {editingUser 
                      ? (updateMutation.isPending ? "Обновление..." : "Обновить")
                      : (createMutation.isPending ? "Создание..." : "Создать")
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Всего пользователей</p>
                <div className="text-2xl font-bold" data-testid="text-total-users">
                  {users.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Активные</p>
                <div className="text-2xl font-bold text-green-600" data-testid="text-active-users">
                  {users.filter(u => u.status === 'active').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Врачи</p>
                <div className="text-2xl font-bold text-purple-600" data-testid="text-doctor-users">
                  {users.filter(u => u.role === 'врач').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Администраторы</p>
                <div className="text-2xl font-bold text-blue-600" data-testid="text-admin-users">
                  {users.filter(u => u.role === 'администратор' || u.role === 'admin').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
          <CardDescription>
            Управление учетными записями сотрудников системы
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Загрузка пользователей...</div>
          ) : (
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
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
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
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          data-testid={`button-edit-${user.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}