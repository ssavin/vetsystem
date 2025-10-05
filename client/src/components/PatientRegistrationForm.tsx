import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { z } from "zod"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { Save, X, Plus, UserPlus, Star, Trash2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Patient creation schema matching backend
const patientFormSchema = z.object({
  name: z.string().min(1, "Введите кличку"),
  species: z.string().min(1, "Выберите вид"),
  breed: z.string().optional(),
  gender: z.enum(["male", "female", "unknown"]).optional(),
  birthDate: z.string().optional(),
  color: z.string().optional(),
  weight: z.string().optional(),
  microchipNumber: z.string().optional(),
  isNeutered: z.boolean().default(false),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  specialMarks: z.string().optional(),
  branchId: z.string().optional(),
  ownerIds: z.array(z.string()).min(1, "Выберите хотя бы одного владельца"),
})

type PatientFormData = z.infer<typeof patientFormSchema>

interface Owner {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
}

interface SelectedOwner extends Owner {
  isPrimary: boolean
}

interface PatientRegistrationFormProps {
  patient?: any // Existing patient for edit mode
  onSuccess?: () => void
  onCancel?: () => void
}

export default function PatientRegistrationForm({ patient, onSuccess, onCancel }: PatientRegistrationFormProps) {
  const isEditMode = !!patient
  const { toast } = useToast()
  const [selectedOwners, setSelectedOwners] = useState<SelectedOwner[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isOwnerDialogOpen, setIsOwnerDialogOpen] = useState(false)
  const [isNewOwnerDialogOpen, setIsNewOwnerDialogOpen] = useState(false)
  const [newOwnerData, setNewOwnerData] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  })

  // Get current branch
  const { data: currentBranch } = useQuery<{ id: string, name: string }>({
    queryKey: ['/api/auth/current-branch'],
  })

  // Search owners
  const { data: searchResults = [] } = useQuery<Owner[]>({
    queryKey: ['/api/owners/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return []
      const res = await fetch(`/api/owners/search?query=${encodeURIComponent(searchQuery)}&limit=20`, {
        credentials: 'include',
      })
      if (!res.ok) return []
      return res.json()
    },
    enabled: searchQuery.length >= 2,
  })

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: patient?.name || "",
      species: patient?.species || "",
      breed: patient?.breed || "",
      gender: patient?.gender || undefined,
      birthDate: patient?.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : "",
      color: patient?.color || "",
      weight: patient?.weight || "",
      microchipNumber: patient?.microchipNumber || "",
      isNeutered: patient?.isNeutered || false,
      allergies: patient?.allergies || "",
      chronicConditions: patient?.chronicConditions || "",
      specialMarks: patient?.specialMarks || "",
      branchId: patient?.branchId || "",
      ownerIds: [],
    },
  })

  // Load patient owners in edit mode
  useEffect(() => {
    if (isEditMode && patient?.id) {
      fetch(`/api/patients/${patient.id}/owners`, {
        credentials: 'include',
      })
        .then(res => res.ok ? res.json() : [])
        .then((owners: any[]) => {
          const loadedOwners = owners.map(po => ({
            id: po.owner.id,
            name: po.owner.name,
            phone: po.owner.phone,
            email: po.owner.email,
            address: po.owner.address,
            isPrimary: po.isPrimary
          }))
          setSelectedOwners(loadedOwners)
          // Clear validation errors after loading owners
          if (loadedOwners.length > 0) {
            form.clearErrors('ownerIds')
          }
        })
        .catch(() => {})
    }
  }, [isEditMode, patient?.id, form])

  // Sync branchId when current branch loads (only in create mode)
  useEffect(() => {
    if (!isEditMode && currentBranch?.id) {
      form.setValue('branchId', currentBranch.id)
    }
  }, [isEditMode, currentBranch?.id, form])

  // Sync ownerIds with selectedOwners (primary owner must be first)
  useEffect(() => {
    // Sort owners: primary first, then others by original order
    const sortedOwners = [...selectedOwners].sort((a, b) => {
      if (a.isPrimary) return -1
      if (b.isPrimary) return 1
      return 0
    })
    const ownerIds = sortedOwners.map(o => o.id)
    form.setValue('ownerIds', ownerIds)
    form.trigger('ownerIds') // Trigger validation
  }, [selectedOwners, form])

  // Create owner mutation
  const createOwnerMutation = useMutation({
    mutationFn: async (ownerData: typeof newOwnerData) => {
      const res = await apiRequest('POST', '/api/owners', ownerData)
      return await res.json() as Owner
    },
    onSuccess: (newOwner: Owner) => {
      queryClient.invalidateQueries({ queryKey: ['/api/owners'] })
      addOwner(newOwner, selectedOwners.length === 0)
      setIsNewOwnerDialogOpen(false)
      setNewOwnerData({ name: "", phone: "", email: "", address: "" })
      toast({
        title: "Владелец создан",
        description: `${newOwner.name} успешно добавлен`,
      })
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать владельца",
        variant: "destructive",
      })
    },
  })

  // Create/Update patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      if (isEditMode && patient?.id) {
        const res = await apiRequest('PUT', `/api/patients/${patient.id}`, data)
        return await res.json()
      } else {
        const res = await apiRequest('POST', '/api/patients', data)
        return await res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] })
      toast({
        title: isEditMode ? "Пациент обновлен" : "Пациент зарегистрирован",
        description: isEditMode ? "Данные пациента успешно обновлены" : "Пациент успешно добавлен в систему",
      })
      if (onSuccess) onSuccess()
    },
    onError: (error: any) => {
      toast({
        title: isEditMode ? "Ошибка обновления" : "Ошибка регистрации",
        description: error.message || (isEditMode ? "Не удалось обновить пациента" : "Не удалось зарегистрировать пациента"),
        variant: "destructive",
      })
    },
  })

  const addOwner = (owner: Owner, setPrimary: boolean = false) => {
    if (selectedOwners.some(o => o.id === owner.id)) {
      toast({
        title: "Владелец уже добавлен",
        variant: "destructive",
      })
      return
    }
    
    const newOwner: SelectedOwner = {
      ...owner,
      isPrimary: setPrimary || selectedOwners.length === 0 // First owner is primary by default
    }
    
    setSelectedOwners([...selectedOwners, newOwner])
    setSearchQuery("")
    setIsOwnerDialogOpen(false)
  }

  const removeOwner = (ownerId: string) => {
    const removedOwner = selectedOwners.find(o => o.id === ownerId)
    const newOwners = selectedOwners.filter(o => o.id !== ownerId)
    
    // If removed owner was primary and there are other owners, make first one primary
    if (removedOwner?.isPrimary && newOwners.length > 0) {
      newOwners[0].isPrimary = true
    }
    
    setSelectedOwners(newOwners)
  }

  const setPrimaryOwner = (ownerId: string) => {
    // Update isPrimary flags and reorder so primary is first
    const updatedOwners = selectedOwners.map(owner => ({
      ...owner,
      isPrimary: owner.id === ownerId
    }))
    
    // Sort: primary first
    const sortedOwners = [...updatedOwners].sort((a, b) => {
      if (a.isPrimary) return -1
      if (b.isPrimary) return 1
      return 0
    })
    
    setSelectedOwners(sortedOwners)
  }

  const onSubmit = (data: PatientFormData) => {
    // Ensure branchId is set
    if (!data.branchId && !currentBranch?.id) {
      toast({
        title: "Ошибка",
        description: "Филиал не определен. Попробуйте обновить страницу.",
        variant: "destructive",
      })
      return
    }
    
    // Sort owners: primary first (backend uses first as primary)
    const sortedOwners = [...selectedOwners].sort((a, b) => {
      if (a.isPrimary) return -1
      if (b.isPrimary) return 1
      return 0
    })
    
    const submitData = {
      ...data,
      ownerIds: sortedOwners.map(o => o.id),
      branchId: data.branchId || currentBranch?.id,
    }
    
    createPatientMutation.mutate(submitData)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Owner Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Владельцы пациента</span>
              <div className="flex gap-2">
                <Dialog open={isOwnerDialogOpen} onOpenChange={setIsOwnerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" size="sm" variant="outline" data-testid="button-select-owner">
                      <Search className="h-4 w-4 mr-2" />
                      Выбрать владельца
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Поиск владельца</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Введите имя или телефон..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="input-search-owner"
                      />
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {searchResults.map((owner) => (
                            <Card key={owner.id} className="cursor-pointer hover-elevate" onClick={() => addOwner(owner)}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold">{owner.name}</p>
                                    <p className="text-sm text-muted-foreground">{owner.phone}</p>
                                    {owner.email && <p className="text-xs text-muted-foreground">{owner.email}</p>}
                                  </div>
                                  <Button type="button" size="sm" variant="ghost" data-testid={`button-add-owner-${owner.id}`}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {searchQuery.length >= 2 && searchResults.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">Владельцы не найдены</p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isNewOwnerDialogOpen} onOpenChange={setIsNewOwnerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" size="sm" data-testid="button-create-owner">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Новый владелец
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Создать владельца</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="new-owner-name">ФИО *</Label>
                        <Input
                          id="new-owner-name"
                          value={newOwnerData.name}
                          onChange={(e) => setNewOwnerData({ ...newOwnerData, name: e.target.value })}
                          placeholder="Фамилия Имя Отчество"
                          required
                          data-testid="input-new-owner-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-owner-phone">Телефон *</Label>
                        <Input
                          id="new-owner-phone"
                          value={newOwnerData.phone}
                          onChange={(e) => setNewOwnerData({ ...newOwnerData, phone: e.target.value })}
                          placeholder="+7 (999) 123-45-67"
                          required
                          data-testid="input-new-owner-phone"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-owner-email">Email</Label>
                        <Input
                          id="new-owner-email"
                          type="email"
                          value={newOwnerData.email}
                          onChange={(e) => setNewOwnerData({ ...newOwnerData, email: e.target.value })}
                          placeholder="email@example.com"
                          data-testid="input-new-owner-email"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-owner-address">Адрес</Label>
                        <Input
                          id="new-owner-address"
                          value={newOwnerData.address}
                          onChange={(e) => setNewOwnerData({ ...newOwnerData, address: e.target.value })}
                          placeholder="Адрес проживания"
                          data-testid="input-new-owner-address"
                        />
                      </div>
                      <Button 
                        type="button" 
                        className="w-full" 
                        onClick={() => createOwnerMutation.mutate(newOwnerData)}
                        disabled={!newOwnerData.name || !newOwnerData.phone || createOwnerMutation.isPending}
                        data-testid="button-save-new-owner"
                      >
                        {createOwnerMutation.isPending ? "Создание..." : "Создать владельца"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOwners.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Выберите владельца пациента</p>
            ) : (
              <div className="space-y-2">
                {selectedOwners.map((owner) => (
                  <Card key={owner.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          size="icon"
                          variant={owner.isPrimary ? "default" : "outline"}
                          onClick={() => setPrimaryOwner(owner.id)}
                          title={owner.isPrimary ? "Основной владелец" : "Сделать основным"}
                          data-testid={`button-set-primary-${owner.id}`}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {owner.name}
                            {owner.isPrimary && <Badge variant="default">Основной</Badge>}
                          </p>
                          <p className="text-sm text-muted-foreground">{owner.phone}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeOwner(owner.id)}
                        data-testid={`button-remove-owner-${owner.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {form.formState.errors.ownerIds && (
              <p className="text-sm text-destructive mt-2">{form.formState.errors.ownerIds.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Patient Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? "Редактирование пациента" : "Информация о пациенте"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Кличка *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Введите кличку" data-testid="input-patient-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="species"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Вид *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-species">
                          <SelectValue placeholder="Выберите вид" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cat">Кошка</SelectItem>
                        <SelectItem value="dog">Собака</SelectItem>
                        <SelectItem value="rabbit">Кролик</SelectItem>
                        <SelectItem value="bird">Птица</SelectItem>
                        <SelectItem value="hamster">Хомяк</SelectItem>
                        <SelectItem value="other">Другое</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Порода</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Введите породу" data-testid="input-breed" />
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
                        <SelectItem value="unknown">Неизвестно</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата рождения</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-birth-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Окрас</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Описание окраса" data-testid="input-color" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Вес (кг)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} placeholder="0.0" data-testid="input-weight" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="microchipNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер чипа</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Номер микрочипа" data-testid="input-microchip" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isNeutered"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-neutered"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Кастрирован/стерилизован</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Аллергии</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Известные аллергии..." data-testid="textarea-allergies" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chronicConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Хронические заболевания</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Хронические заболевания..." data-testid="textarea-chronic" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialMarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Особые приметы</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Шрамы, особые отметки..." data-testid="textarea-marks" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={createPatientMutation.isPending}
            data-testid="button-cancel"
          >
            <X className="h-4 w-4 mr-2" />
            Отменить
          </Button>
          <Button 
            type="submit" 
            disabled={createPatientMutation.isPending || selectedOwners.length === 0}
            data-testid="button-save-patient"
          >
            <Save className="h-4 w-4 mr-2" />
            {createPatientMutation.isPending 
              ? "Сохранение..." 
              : isEditMode ? "Обновить пациента" : "Сохранить пациента"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
