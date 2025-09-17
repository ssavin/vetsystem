import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  Building2,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react"

// Form validation schema
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

interface Branch {
  id: string
  name: string
  address: string
  city: string
  region?: string
  phone: string
  email?: string
  description?: string
  status: string
  createdAt: string
  updatedAt: string
}

export default function Branches() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const { toast } = useToast()

  // Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-500" />
      case 'maintenance':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      default:
        return <Building2 className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-branches-title">Управление отделениями</h1>
          <p className="text-muted-foreground">Создание и управление отделениями клиники</p>
        </div>
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

      {/* Search */}
      <Card>
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      {/* Branches List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branchesLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
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
        ) : filteredBranches.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Отделения не найдены</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Попробуйте изменить условия поиска" : "Создайте первое отделение клиники"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-branch">
                <Plus className="h-4 w-4 mr-2" />
                Создать отделение
              </Button>
            )}
          </div>
        ) : (
          filteredBranches.map((branch) => (
            <Card key={branch.id} className="hover-elevate" data-testid={`card-branch-${branch.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(branch.status)}
                    <CardTitle className="text-lg">{branch.name}</CardTitle>
                  </div>
                  {getStatusBadge(branch.status)}
                </div>
                <CardDescription className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-1" />
                  {branch.city}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="break-words">{branch.address}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                  {branch.email && (
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="break-all">{branch.email}</span>
                    </div>
                  )}
                </div>

                {branch.description && (
                  <>
                    <Separator />
                    <p className="text-sm text-muted-foreground">
                      {branch.description}
                    </p>
                  </>
                )}

                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs text-muted-foreground">
                    Создано: {new Date(branch.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                  <div className="flex space-x-1">
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
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Statistics */}
      {!branchesLoading && branches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Статистика отделений
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {branches.filter(b => b.status === 'maintenance').length}
                </div>
                <div className="text-sm text-muted-foreground">На техобслуживании</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}