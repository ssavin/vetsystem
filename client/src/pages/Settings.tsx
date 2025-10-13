import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Users,
  FileText
} from "lucide-react"
import { useState, useMemo, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { insertUserSchema, updateUserSchema, User, USER_ROLES, Branch, SystemSetting, insertSystemSettingSchema, updateSystemSettingSchema, LegalEntity, insertLegalEntitySchema, InsertLegalEntity } from "@shared/schema"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import IntegrationsSettings from "@/components/IntegrationsSettings"
import { useAuth } from "@/contexts/AuthContext"
import LegalEntities from "./LegalEntities"
import DocumentTemplates from "./DocumentTemplates"

// Form validation schema for branches
const branchSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(255, "Название слишком длинное"),
  legalEntityId: z.string().uuid().nullable().optional(),
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
type UpdateUserFormValues = z.infer<typeof updateUserSchema>

export default function Settings() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superadmin'
  
  const [clinicName, setClinicName] = useState("")
  const [clinicAddress, setClinicAddress] = useState("")
  const [clinicPhone, setClinicPhone] = useState("")
  const [clinicEmail, setClinicEmail] = useState("")
  
  // Legal and license information
  const [legalName, setLegalName] = useState("")
  const [inn, setInn] = useState("")
  const [kpp, setKpp] = useState("")
  const [ogrn, setOgrn] = useState("")
  const [veterinaryLicenseNumber, setVeterinaryLicenseNumber] = useState("")
  const [veterinaryLicenseIssueDate, setVeterinaryLicenseIssueDate] = useState("")
  const [legalEntityId, setLegalEntityId] = useState<string | null>(null)
  
  // Branch management state
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  
  // Legal entities state
  const [isCreateLegalEntityDialogOpen, setIsCreateLegalEntityDialogOpen] = useState(false)
  const [editingLegalEntity, setEditingLegalEntity] = useState<LegalEntity | null>(null)
  
  // User management state
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  const { toast } = useToast()
  const userQueryClient = useQueryClient()
  
  // Ref for scrolling to integrations section
  const integrationsRef = useRef<HTMLDivElement>(null)
  
  const scrollToIntegrations = () => {
    integrationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  
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

  // Fiscal Receipt Settings state
  const [fiscalReceiptSystem, setFiscalReceiptSystem] = useState<string>("yookassa")
  
  // 1С Розница Configuration state
  const [onecConfig, setOnecConfig] = useState({
    baseUrl: "",
    username: "",
    password: "",
    organizationKey: "",
    cashRegisterKey: ""
  })
  
  // МойСклад Nomenclature Sync state
  const [nomenclatureSyncStatus, setNomenclatureSyncStatus] = useState<{
    localProducts: number;
    localServices: number;
    isLoading: boolean;
    lastSync: string | null;
  }>({
    localProducts: 0,
    localServices: 0,
    isLoading: false,
    lastSync: null
  })

  // Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  })

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  })

  // Fetch legal entities
  const { data: legalEntities = [], isLoading: legalEntitiesLoading } = useQuery<LegalEntity[]>({
    queryKey: ['/api/legal-entities'],
  })

  // Fetch system settings for fiscal receipts
  const { data: systemSettingsData = [], isLoading: systemSettingsLoading } = useQuery<SystemSetting[]>({
    queryKey: ['/api/system-settings'],
  })

  // Fetch current tenant info (invalidated on user change via AuthContext)
  const { data: currentTenant, isLoading: tenantLoading, refetch: refetchTenant } = useQuery<{
    id: string;
    name: string;
    legalAddress: string | null;
    phone: string | null;
    email: string | null;
    legalName: string | null;
    inn: string | null;
    kpp: string | null;
    ogrn: string | null;
    veterinaryLicenseNumber: string | null;
    veterinaryLicenseIssueDate: string | null;
    legalEntityId: string | null;
    settings: any;
    isSuperAdmin?: boolean;
  }>({
    queryKey: ['/api/tenant/current'],
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch when component mounts
  })

  // Fetch legal entities
  const { data: legalEntities = [], isLoading: legalEntitiesLoading } = useQuery<LegalEntity[]>({
    queryKey: ['/api/legal-entities/active'],
    enabled: !isSuperAdmin,
  })

  // Initialize clinic info from tenant data
  useEffect(() => {
    if (isSuperAdmin) {
      // Clear fields for superadmin
      setClinicName("")
      setClinicAddress("")
      setClinicPhone("")
      setClinicEmail("")
      setLegalName("")
      setInn("")
      setKpp("")
      setOgrn("")
      setVeterinaryLicenseNumber("")
      setVeterinaryLicenseIssueDate("")
      setLegalEntityId(null)
    } else if (currentTenant && currentTenant.id !== 'superadmin') {
      // Load tenant data for regular admin
      setClinicName(currentTenant.name || "")
      setClinicAddress(currentTenant.legalAddress || "")
      setClinicPhone(currentTenant.phone || "")
      setClinicEmail(currentTenant.email || "")
      setLegalName(currentTenant.legalName || "")
      setInn(currentTenant.inn || "")
      setKpp(currentTenant.kpp || "")
      setOgrn(currentTenant.ogrn || "")
      setVeterinaryLicenseNumber(currentTenant.veterinaryLicenseNumber || "")
      setVeterinaryLicenseIssueDate(currentTenant.veterinaryLicenseIssueDate || "")
      setLegalEntityId(currentTenant.legalEntityId || null)
    }
  }, [currentTenant, isSuperAdmin])

  // Initialize fiscal receipt system from server data
  useEffect(() => {
    const fiscalSetting = systemSettingsData.find(s => s.key === 'fiscal_receipt_system')
    if (fiscalSetting) {
      setFiscalReceiptSystem(fiscalSetting.value)
    }
  }, [systemSettingsData])

  // Mutation for updating system settings
  const updateSystemSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const existingSetting = systemSettingsData.find(s => s.key === key)
      
      if (existingSetting) {
        return apiRequest('PUT', `/api/system-settings/${key}`, { value })
      } else {
        return apiRequest('POST', '/api/system-settings', {
          key,
          value,
          category: 'fiscal_receipts',
          description: key === 'fiscal_receipt_system' ? 'Система печати фискальных чеков' : ''
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings'] })
      toast({
        title: "Настройки сохранены",
        description: "Настройки фискальных чеков успешно обновлены",
      })
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      })
    },
  })

  // МойСклад nomenclature sync queries and mutations
  const { data: syncStatus, isLoading: syncStatusLoading } = useQuery({
    queryKey: ['/api/moysklad/nomenclature/sync-status'],
    enabled: true,
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });

  const syncNomenclatureMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/moysklad/nomenclature/sync')
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/moysklad/nomenclature/sync-status'] });
      toast({
        title: "Двухсторонняя синхронизация завершена",
        description: `Импорт: ${data?.data?.imported?.products || 0} товаров, ${data?.data?.imported?.services || 0} услуг | Экспорт: ${data?.data?.exported?.products || 0} товаров, ${data?.data?.exported?.services || 0} услуг`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка синхронизации",
        description: error.message || "Не удалось синхронизировать номенклатуру с МойСклад",
        variant: "destructive",
      });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/moysklad/test-connection')
    },
    onSuccess: (data: any) => {
      toast({
        title: "Подключение успешно",
        description: data?.message || "Подключение к МойСклад установлено",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка подключения",
        description: error.message || "Не удалось подключиться к МойСклад",
        variant: "destructive",
      });
    }
  });

  // 1С Розница sync queries and mutations
  const { data: onecStats, isLoading: onecStatsLoading } = useQuery({
    queryKey: ['/api/onec/stats'],
    enabled: true,
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });

  const syncOnecProductsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/onec/products/sync')
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/onec/stats'] });
      toast({
        title: "Синхронизация товаров завершена",
        description: `Загружено: ${data?.imported || 0} товаров из 1С Розница`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка синхронизации товаров",
        description: error.message || "Не удалось синхронизировать товары с 1С Розница",
        variant: "destructive",
      });
    }
  });

  const syncOnecServicesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/onec/services/sync')
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/onec/stats'] });
      toast({
        title: "Синхронизация услуг завершена",
        description: `Загружено: ${data?.imported || 0} услуг из 1С Розница`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка синхронизации услуг",
        description: error.message || "Не удалось синхронизировать услуги с 1С Розница",
        variant: "destructive",
      });
    }
  });

  const testOnecConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/onec/test-connection')
    },
    onSuccess: (data: any) => {
      toast({
        title: "Подключение успешно",
        description: data?.message || "Подключение к 1С Розница установлено",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка подключения",
        description: error.message || "Не удалось подключиться к 1С Розница",
        variant: "destructive",
      });
    }
  });

  // Загрузка конфигурации 1С
  const { data: onecConfig1C, isLoading: onecConfigLoading } = useQuery({
    queryKey: ['/api/onec/config'],
    enabled: true,
  });

  // Сохранение конфигурации 1С
  const saveOnecConfigMutation = useMutation({
    mutationFn: async (config: typeof onecConfig) => {
      return apiRequest('POST', '/api/onec/config', config)
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/onec/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onec/stats'] });
      toast({
        title: "Настройки сохранены",
        description: data?.message || "Параметры подключения к 1С Розница обновлены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить настройки 1С Розница",
        variant: "destructive",
      });
    }
  });

  // Обновляем локальные настройки когда загружаются с сервера
  useEffect(() => {
    if (onecConfig1C?.data) {
      setOnecConfig(onecConfig1C.data);
    }
  }, [onecConfig1C]);

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

  // Dynamic schema resolver based on edit mode
  const userFormSchema = useMemo(() => 
    editingUser ? updateUserSchema : insertUserSchema,
    [editingUser]
  );

  const userForm = useForm<UserFormValues | UpdateUserFormValues>({
    resolver: zodResolver(userFormSchema),
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
      const errorMessage = error?.details || error?.error || error?.message || "Не удалось удалить отделение"
      toast({
        title: "Ошибка", 
        description: errorMessage,
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

  const saveTenantSettingsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PUT', '/api/tenant/settings', {
        name: clinicName,
        legalEntityId: legalEntityId || null,
        legalAddress: clinicAddress,
        phone: clinicPhone,
        email: clinicEmail,
        legalName: legalName || null,
        inn: inn || null,
        kpp: kpp || null,
        ogrn: ogrn || null,
        veterinaryLicenseNumber: veterinaryLicenseNumber || null,
        veterinaryLicenseIssueDate: veterinaryLicenseIssueDate || null,
        settings: {
          notifications,
          system: systemSettings
        }
      })
    },
    onSuccess: async () => {
      // Force refetch to bypass HTTP cache
      await refetchTenant()
      toast({
        title: "Настройки сохранены",
        description: "Информация о клинике успешно обновлена",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить настройки",
        variant: "destructive",
      })
    },
  })

  const saveSettings = () => {
    saveTenantSettingsMutation.mutate()
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
      legalEntityId: branch.legalEntityId || undefined,
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
  const filteredBranches = Array.isArray(branches) ? branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.address.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

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

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general-settings">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Общие настройки
          </TabsTrigger>
          <TabsTrigger value="branches" data-testid="tab-branches">
            <Building2 className="h-4 w-4 mr-2" />
            Управление отделениями
          </TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff">
            <Users className="h-4 w-4 mr-2" />
            Управление сотрудниками
          </TabsTrigger>
          <TabsTrigger value="legal-entities" data-testid="tab-legal-entities">
            <Building2 className="h-4 w-4 mr-2" />
            Юридические лица
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-document-templates">
            <FileText className="h-4 w-4 mr-2" />
            Шаблоны документов
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">

      {/* Clinic Information - hidden for superadmin */}
      {!isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Информация о клинике
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Основная информация</h3>
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
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3">Юридические данные</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="legalEntity">Юридическое лицо</Label>
                  <Select 
                    value={legalEntityId || "none"} 
                    onValueChange={(value) => setLegalEntityId(value === "none" ? null : value)}
                  >
                    <SelectTrigger id="legalEntity" data-testid="select-legal-entity">
                      <SelectValue placeholder="Выберите юридическое лицо" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не выбрано</SelectItem>
                      {legalEntities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.legalName} (ИНН: {entity.inn})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Выберите юр.лицо из списка или заполните данные вручную ниже
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalName">Юридическое название</Label>
                  <Input
                    id="legalName"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="ООО &quot;Ветеринарная клиника&quot;"
                    data-testid="input-legal-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inn">ИНН</Label>
                  <Input
                    id="inn"
                    value={inn}
                    onChange={(e) => setInn(e.target.value)}
                    placeholder="1234567890"
                    maxLength={12}
                    data-testid="input-inn"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kpp">КПП</Label>
                  <Input
                    id="kpp"
                    value={kpp}
                    onChange={(e) => setKpp(e.target.value)}
                    placeholder="123456789"
                    maxLength={9}
                    data-testid="input-kpp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ogrn">ОГРН/ОГРНИП</Label>
                  <Input
                    id="ogrn"
                    value={ogrn}
                    onChange={(e) => setOgrn(e.target.value)}
                    placeholder="1234567890123"
                    maxLength={15}
                    data-testid="input-ogrn"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3">Ветеринарная лицензия</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="veterinaryLicenseNumber">Номер лицензии</Label>
                  <Input
                    id="veterinaryLicenseNumber"
                    value={veterinaryLicenseNumber}
                    onChange={(e) => setVeterinaryLicenseNumber(e.target.value)}
                    placeholder="Введите номер лицензии"
                    data-testid="input-vet-license-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="veterinaryLicenseIssueDate">Дата выдачи лицензии</Label>
                  <Input
                    id="veterinaryLicenseIssueDate"
                    type="date"
                    value={veterinaryLicenseIssueDate}
                    onChange={(e) => setVeterinaryLicenseIssueDate(e.target.value)}
                    data-testid="input-vet-license-date"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={saveSettings} data-testid="button-save-clinic-info">
                <Save className="h-4 w-4 mr-2" />
                Сохранить информацию
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Fiscal Receipt Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Фискальные чеки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fiscalReceiptSystem">Система печати фискальных чеков</Label>
              <p className="text-sm text-muted-foreground">
                Выберите систему для печати фискальных чеков в соответствии с требованиями 54-ФЗ
              </p>
              <Select 
                value={fiscalReceiptSystem} 
                onValueChange={(value) => {
                  setFiscalReceiptSystem(value)
                  updateSystemSettingMutation.mutate({ key: 'fiscal_receipt_system', value })
                }}
                disabled={systemSettingsLoading || updateSystemSettingMutation.isPending}
              >
                <SelectTrigger data-testid="select-fiscal-system">
                  <SelectValue placeholder="Выберите систему печати" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yookassa">YooKassa (ЮKassa)</SelectItem>
                  <SelectItem value="moysklad">Мой склад</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Дополнительные настройки
          </CardTitle>
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
            <Button variant="outline" className="h-16 flex-col gap-2" onClick={scrollToIntegrations} data-testid="button-sms-config">
              <Phone className="h-5 w-5" />
              <span>Настройки SMS</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrations Management */}
      <div ref={integrationsRef}>
        <IntegrationsSettings />
      </div>

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

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveSettings} data-testid="button-save-settings">
              <Save className="h-4 w-4 mr-2" />
              Сохранить настройки
            </Button>
          </div>
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches">
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
                      name="legalEntityId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Юридическое лицо</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-branch-legal-entity">
                                <SelectValue placeholder="Выберите юридическое лицо" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Не выбрано</SelectItem>
                              {legalEntities.map((entity) => (
                                <SelectItem key={entity.id} value={entity.id}>
                                  {entity.legalName} (ИНН: {entity.inn})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Юридическое лицо, к которому относится данное отделение
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Управление сотрудниками
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
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              defaultValue={field.value}
                            >
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
                ) : !Array.isArray(users) || users.length === 0 ? (
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
                  {users.filter(u => u.role === 'администратор' || u.role === 'admin').length}
                </div>
                <div className="text-sm text-muted-foreground">Администраторов</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Legal Entities Tab */}
        <TabsContent value="legal-entities">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Юридические лица
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Управление юридическими лицами здесь...</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Templates Tab */}
        <TabsContent value="templates">
          <DocumentTemplates />
        </TabsContent>
      </Tabs>
    </div>
  )
}
