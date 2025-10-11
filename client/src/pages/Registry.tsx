import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, Plus, Filter, FileText, Calendar, Phone, User, ClipboardList, Building2, Trash2, Pencil, Printer } from "lucide-react"
import PatientRegistrationForm from "@/components/PatientRegistrationForm"
import OwnerRegistrationForm from "@/components/OwnerRegistrationForm"
import CreateCaseDialog from "@/components/CreateCaseDialog"
import { PrintDocumentButton } from "@/components/PrintDocumentButton"
import { AIAssistantWidget } from "@/components/AIAssistantWidget"
import { useLocation } from "wouter"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { translateSpecies } from "@/lib/utils"

// Helper functions for patient status
const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'healthy': return 'outline'
    case 'treatment': return 'secondary' 
    case 'critical': return 'destructive'
    default: return 'default'
  }
}


interface PatientTableRowProps {
  patient: {
    id: string
    name: string
    species: string
    breed: string
    age: string
    owner: string
    ownerPhone: string
    status: 'healthy' | 'treatment' | 'critical'
    lastVisit?: string
    avatar?: string
    owners?: Array<{ id: string, name: string, phone?: string, isPrimary?: boolean }>
  }
  onEdit?: (patient: any) => void
  onDelete?: (patient: { id: string, name: string }) => void
}

function PatientTableRow({ patient, onEdit, onDelete }: PatientTableRowProps) {
  const { t } = useTranslation('registry')
  const [, navigate] = useLocation()

  const getStatusText = (status: string) => {
    return t(`status.${status}`, { defaultValue: t('status.unknown') })
  }

  return (
    <TableRow className="hover-elevate">
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={patient.avatar} />
            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium" data-testid={`text-patient-name-${patient.id}`}>
              {patient.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {patient.age}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <div className="font-medium">{translateSpecies(patient.species)}</div>
          <div className="text-muted-foreground">{patient.breed}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span data-testid={`text-owner-${patient.id}`}>{patient.owner}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3" />
          <span data-testid={`text-phone-${patient.id}`}>{patient.ownerPhone}</span>
        </div>
      </TableCell>
      <TableCell>
        {patient.lastVisit && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span data-testid={`text-last-visit-${patient.id}`}>{patient.lastVisit}</span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-1 justify-end">
          <CreateCaseDialog 
            patientId={patient.id} 
            patientName={patient.name}
            trigger={
              <Button
                size="sm"
                variant="outline"
                data-testid={`button-create-case-${patient.id}`}
              >
                <ClipboardList className="h-3 w-3 mr-1" />
                {t('patients.createCase')}
              </Button>
            }
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/medical-records?patientId=${patient.id}`)
                }}
                data-testid={`button-view-records-${patient.id}`}
              >
                <FileText className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('patients.viewRecords', 'Медицинские записи')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  const primaryOwner = patient.owners?.find(o => o.isPrimary) || patient.owners?.[0]
                  const params = new URLSearchParams({
                    patientId: patient.id,
                    ...(primaryOwner?.id && { ownerId: primaryOwner.id })
                  })
                  navigate(`/schedule?${params.toString()}`)
                }}
                data-testid={`button-schedule-appointment-${patient.id}`}
              >
                <Calendar className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('patients.scheduleAppointment', 'Записать на прием')}</p>
            </TooltipContent>
          </Tooltip>
          {onEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(patient)
                  }}
                  data-testid={`button-edit-patient-${patient.id}`}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('patients.editPatient', 'Редактировать пациента')}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete({ id: patient.id, name: patient.name })
                  }}
                  data-testid={`button-delete-patient-${patient.id}`}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('patients.deletePatient', 'Удалить пациента')}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function Registry() {
  const { t } = useTranslation('registry')
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [showOwnerForm, setShowOwnerForm] = useState(false)
  const [activeTab, setActiveTab] = useState<"clients" | "patients">("patients")
  const [patientsPage, setPatientsPage] = useState(1)
  const [ownersPage, setOwnersPage] = useState(1)
  const [pageSize] = useState(50)
  const [ownerToDelete, setOwnerToDelete] = useState<{ id: string, name: string } | null>(null)
  const [ownerToEdit, setOwnerToEdit] = useState<{ id: string, name: string, phone?: string, email?: string, address?: string } | null>(null)
  const [patientToDelete, setPatientToDelete] = useState<{ id: string, name: string } | null>(null)
  const [patientToEdit, setPatientToEdit] = useState<any | null>(null)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Get current user and branch info
  const { data: authData } = useQuery<{ user: any, currentBranch: { id: string, name: string } | null }>({
    queryKey: ['/api/auth/me'],
  })
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")

  // Set default branch to current user branch when loaded
  useEffect(() => {
    const branchId = authData?.currentBranch?.id
    if (branchId && !selectedBranchId) {
      setSelectedBranchId(branchId)
    }
  }, [authData?.currentBranch?.id])

  // Handle patient edit - load full patient data
  useEffect(() => {
    if (patientToEdit?.id && !showPatientForm && !patientToEdit.microchipNumber) {
      // Only load if we don't have full patient data (check for a field that's not in table view)
      fetch(`/api/patients/${patientToEdit.id}`, {
        credentials: 'include',
      })
        .then(res => res.ok ? res.json() : null)
        .then((fullPatient) => {
          if (fullPatient) {
            setPatientToEdit(fullPatient)
            setShowPatientForm(true)
          }
        })
        .catch(() => {
          toast({
            title: "Ошибка",
            description: "Не удалось загрузить данные пациента",
            variant: "destructive"
          })
          setPatientToEdit(null)
        })
    } else if (patientToEdit && patientToEdit.microchipNumber !== undefined) {
      // Already have full data, just open form
      setShowPatientForm(true)
    }
  }, [patientToEdit?.id, showPatientForm])

  // Fetch available branches
  const { data: branchesData = [] } = useQuery({
    queryKey: ['/api/branches/active'],
  })

  // Fetch patients from API based on selected branch (with owner data joined)
  const { data: patientsResponse, isLoading: isPatientsLoading } = useQuery({
    queryKey: ['/api/patients', selectedBranchId, patientsPage, debouncedSearchTerm, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        branchId: selectedBranchId || '',
        page: patientsPage.toString(),
        limit: pageSize.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      })
      const res = await fetch(`/api/patients?${params}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch patients')
      return res.json()
    },
    enabled: activeTab === "patients"
  })

  // Fetch owners from API based on selected branch
  const { data: ownersResponse, isLoading: isOwnersLoading } = useQuery({
    queryKey: ['/api/owners', selectedBranchId, ownersPage, debouncedSearchTerm, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        branchId: selectedBranchId || '',
        page: ownersPage.toString(),
        limit: pageSize.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      })
      const res = await fetch(`/api/owners?${params}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch owners')
      return res.json()
    },
    enabled: activeTab === "clients"
  })

  const patientsData = patientsResponse?.data || []
  const patientsTotalPages = patientsResponse?.totalPages || 1
  const ownersData = ownersResponse?.data || []
  const ownersTotalPages = ownersResponse?.totalPages || 1

  // Delete owner mutation
  const deleteOwnerMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      const response = await fetch(`/api/owners/${ownerId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Не удалось удалить клиента')
      }
      // 204 No Content doesn't have a body
      if (response.status === 204) {
        return null
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/owners'] })
      toast({
        title: "Клиент удален",
        description: "Клиент успешно удален из системы",
      })
      setOwnerToDelete(null)
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить клиента",
        variant: "destructive"
      })
    }
  })

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: string) => {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Не удалось удалить пациента')
      }
      // 204 No Content doesn't have a body
      if (response.status === 204) {
        return null
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] })
      toast({
        title: "Пациент удален",
        description: "Пациент успешно удален из системы",
      })
      setPatientToDelete(null)
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить пациента",
        variant: "destructive"
      })
    }
  })

  // Helper function for age word form
  const getYearWord = (years: number) => {
    const lastDigit = years % 10
    const lastTwoDigits = years % 100

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return t('patients.year_many')
    }
    if (lastDigit === 1) {
      return t('patients.year_one')
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
      return t('patients.year_few')
    }
    return t('patients.year_many')
  }

  // Transform patients to match table format
  const transformedPatients = useMemo(() => {
    if (!Array.isArray(patientsData)) return []
    return patientsData.map((patient: any) => {
      const birthDate = patient.birthDate ? new Date(patient.birthDate) : null
      const years = birthDate 
        ? Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365))
        : null
      const age = years !== null
        ? `${years} ${getYearWord(years)}`
        : t('patients.unknown')

      // Multi-owner support: show primary owner or first owner
      const primaryOwner = patient.owners?.find((o: any) => o.isPrimary) || patient.owners?.[0]
      const allOwners = patient.owners || []
      const ownerDisplay = primaryOwner 
        ? `${primaryOwner.name}${allOwners.length > 1 ? ` (+${allOwners.length - 1})` : ''}`
        : (patient.ownerName || t('patients.unknownOwner'))
      
      // Format last visit date
      const lastVisitDate = patient.lastVisit ? new Date(patient.lastVisit) : null
      const lastVisit = lastVisitDate 
        ? lastVisitDate.toLocaleDateString('ru-RU', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          })
        : undefined

      return {
        id: patient.id,
        name: patient.name,
        species: translateSpecies(patient.species),
        breed: patient.breed || t('patients.unknownBreed'),
        age,
        owner: ownerDisplay,
        ownerPhone: primaryOwner?.phone || patient.ownerPhone || '-',
        status: 'healthy' as const,
        lastVisit,
        owners: allOwners // Store all owners for potential tooltip/details
      }
    })
  }, [patientsData, t])

  // Transform owners data
  const transformedOwners = useMemo(() => {
    if (!Array.isArray(ownersData)) return []
    return ownersData.map((owner: any) => ({
      id: owner.id,
      name: owner.name,
      phone: owner.phone || '-',
      email: owner.email || '-',
      address: owner.address || '-',
    }))
  }, [ownersData])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    // Reset to first page when search changes
    setPatientsPage(1)
    setOwnersPage(1)
  }

  // Reset page when branch changes
  useEffect(() => {
    setPatientsPage(1)
    setOwnersPage(1)
  }, [selectedBranchId])

  if (showPatientForm) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {patientToEdit 
                ? t('editPatientTitle', 'Редактирование пациента') 
                : t('registrationTitle', 'Регистрация пациента')
              }
            </h1>
            <p className="text-muted-foreground">
              {patientToEdit
                ? t('editPatientSubtitle', 'Обновите информацию о пациенте')
                : t('registrationSubtitle', 'Заполните данные пациента')
              }
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowPatientForm(false)
              setPatientToEdit(null)
            }}
            data-testid="button-back-to-registry"
          >
            {t('backToRegistry', 'Назад к реестру')}
          </Button>
        </div>
        <PatientRegistrationForm 
          patient={patientToEdit}
          onSuccess={() => {
            setShowPatientForm(false)
            setPatientToEdit(null)
          }}
        />
      </div>
    )
  }

  if (showOwnerForm || ownerToEdit) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{ownerToEdit ? "Редактирование клиента" : "Регистрация клиента"}</h1>
            <p className="text-muted-foreground">{ownerToEdit ? "Обновите информацию о клиенте" : "Заполните данные клиента"}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowOwnerForm(false)
              setOwnerToEdit(null)
            }}
            data-testid="button-back-to-registry"
          >
            Назад к реестру
          </Button>
        </div>
        <OwnerRegistrationForm 
          owner={ownerToEdit || undefined}
          onSuccess={() => {
            setShowOwnerForm(false)
            setOwnerToEdit(null)
          }}
          onCancel={() => {
            setShowOwnerForm(false)
            setOwnerToEdit(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-registry-title">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'patients' 
              ? t('patients.search', 'Поиск пациентов') 
              : t('clients.search', 'Поиск клиентов')
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-[250px]" data-testid="select-branch">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('selectBranch', 'Выберите филиал')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="branch-option-all">
                  {t('allBranches', 'Все филиалы')}
                </SelectItem>
                {Array.isArray(branchesData) && branchesData.map((branch: any) => (
                  <SelectItem key={branch.id} value={branch.id} data-testid={`branch-option-${branch.id}`}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('patients.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-patients"
              />
            </div>
            <Button variant="outline" data-testid="button-filters">
              <Filter className="h-4 w-4 mr-2" />
              {t('filters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "clients" | "patients")}>
        <TabsList className="mb-4">
          <TabsTrigger value="clients" data-testid="tab-clients">
            {t('tabs.clients', 'Клиенты')}
          </TabsTrigger>
          <TabsTrigger value="patients" data-testid="tab-patients">
            {t('tabs.patients', 'Пациенты')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <div className="flex justify-end mb-4">
            <Button 
              onClick={() => setShowOwnerForm(true)}
              data-testid="button-new-owner"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить клиента
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {isOwnersLoading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transformedOwners.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm ? t('clients.notFound', 'Клиенты не найдены') : t('clients.empty', 'Нет клиентов')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('clients.tableHeaders.name', 'Имя клиента')}</TableHead>
                      <TableHead>{t('clients.tableHeaders.phone', 'Телефон')}</TableHead>
                      <TableHead>{t('clients.tableHeaders.email', 'Email')}</TableHead>
                      <TableHead>{t('clients.tableHeaders.address', 'Адрес')}</TableHead>
                      <TableHead className="text-right">{t('clients.tableHeaders.actions', 'Действия')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transformedOwners.map((owner: any) => (
                      <TableRow key={owner.id} className="hover-elevate">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="font-medium" data-testid={`text-owner-name-${owner.id}`}>
                              {owner.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span data-testid={`text-owner-phone-${owner.id}`}>{owner.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-owner-email-${owner.id}`}>{owner.email}</TableCell>
                        <TableCell data-testid={`text-owner-address-${owner.id}`}>{owner.address}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <PrintDocumentButton
                                  entityId={owner.id}
                                  entityType="owner"
                                  variant="outline"
                                  size="sm"
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Печать согласия на обработку ПД</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setOwnerToEdit(owner)}
                                  data-testid={`button-edit-owner-${owner.id}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('clients.editOwner', 'Редактировать клиента')}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setOwnerToDelete({ id: owner.id, name: owner.name })}
                                  data-testid={`button-delete-owner-${owner.id}`}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('clients.deleteOwner', 'Удалить клиента')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {ownersTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setOwnersPage(Math.max(1, ownersPage - 1))}
                        className={ownersPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: ownersTotalPages }, (_, i) => i + 1)
                      .filter(page => {
                        return page === 1 || 
                               page === ownersTotalPages || 
                               Math.abs(page - ownersPage) <= 1
                      })
                      .map((page, idx, arr) => (
                        <div key={page} className="contents">
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <PaginationItem key={`ellipsis-${page}`}>
                              <span className="px-2">...</span>
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setOwnersPage(page)}
                              isActive={page === ownersPage}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </div>
                      ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setOwnersPage(Math.min(ownersTotalPages, ownersPage + 1))}
                        className={ownersPage === ownersTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="patients">
          <div className="flex justify-end mb-4">
            <Button 
              onClick={() => setShowPatientForm(true)}
              data-testid="button-new-patient"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить пациента
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {isPatientsLoading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transformedPatients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm ? t('patients.notFound') : t('patients.empty')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('patients.tableHeaders.patient')}</TableHead>
                      <TableHead>{t('patients.tableHeaders.speciesBreed')}</TableHead>
                      <TableHead>{t('patients.tableHeaders.owner')}</TableHead>
                      <TableHead>{t('patients.tableHeaders.phone')}</TableHead>
                      <TableHead>{t('patients.tableHeaders.lastVisit')}</TableHead>
                      <TableHead className="text-right">{t('patients.tableHeaders.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transformedPatients.map((patient: any) => (
                      <PatientTableRow 
                        key={patient.id} 
                        patient={patient}
                        onEdit={setPatientToEdit}
                        onDelete={setPatientToDelete}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {patientsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPatientsPage(Math.max(1, patientsPage - 1))}
                        className={patientsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: patientsTotalPages }, (_, i) => i + 1)
                      .filter(page => {
                        return page === 1 || 
                               page === patientsTotalPages || 
                               Math.abs(page - patientsPage) <= 1
                      })
                      .map((page, idx, arr) => (
                        <div key={page} className="contents">
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <PaginationItem key={`ellipsis-${page}`}>
                              <span className="px-2">...</span>
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setPatientsPage(page)}
                              isActive={page === patientsPage}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </div>
                      ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPatientsPage(Math.min(patientsTotalPages, patientsPage + 1))}
                        className={patientsPage === patientsTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete owner confirmation dialog */}
      <AlertDialog open={!!ownerToDelete} onOpenChange={(open) => !open && setOwnerToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-owner-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить клиента?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы действительно хотите удалить клиента <strong>{ownerToDelete?.name}</strong>? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => ownerToDelete && deleteOwnerMutation.mutate(ownerToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete patient confirmation dialog */}
      <AlertDialog open={!!patientToDelete} onOpenChange={(open) => !open && setPatientToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-patient-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пациента?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы действительно хотите удалить пациента <strong>{patientToDelete?.name}</strong>? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-patient">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => patientToDelete && deletePatientMutation.mutate(patientToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-patient"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Assistant for voice-activated search and actions */}
      <AIAssistantWidget role="admin" />
    </div>
  )
}
