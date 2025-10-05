import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
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
import { Search, Plus, Filter, FileText, Calendar, Phone, User, ClipboardList, Building2 } from "lucide-react"
import PatientRegistrationForm from "@/components/PatientRegistrationForm"
import CreateCaseDialog from "@/components/CreateCaseDialog"
import { useLocation } from "wouter"
import { Skeleton } from "@/components/ui/skeleton"

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
  }
}

function PatientTableRow({ patient }: PatientTableRowProps) {
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
          <div className="font-medium">{patient.species}</div>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`button-create-case-${patient.id}`}
                  >
                    <ClipboardList className="h-3 w-3 mr-1" />
                    {t('patients.createCase')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('patients.createCaseTooltip', 'Создать клинический случай')}</p>
                </TooltipContent>
              </Tooltip>
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
                  navigate('/schedule')
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
        </div>
      </TableCell>
    </TableRow>
  )
}


export default function Registry() {
  const { t } = useTranslation('registry')
  const [searchTerm, setSearchTerm] = useState("")
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [activeTab, setActiveTab] = useState<"clients" | "patients">("patients")
  
  // Get current user branch
  const { data: currentBranch } = useQuery<{ id: string, name: string }>({
    queryKey: ['/api/auth/current-branch'],
  })
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")

  // Set default branch to current user branch when loaded
  useEffect(() => {
    if (currentBranch?.id && selectedBranchId === "") {
      setSelectedBranchId(currentBranch.id)
    }
  }, [currentBranch?.id, selectedBranchId])

  // Fetch available branches
  const { data: branchesData = [] } = useQuery({
    queryKey: ['/api/branches/active'],
  })

  // Fetch patients from API based on selected branch (with owner data joined)
  const { data: patientsData = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['/api/patients', selectedBranchId],
    queryFn: async () => {
      const endpoint = selectedBranchId === "all" 
        ? '/api/patients/all' 
        : `/api/patients?branchId=${selectedBranchId}`
      const res = await fetch(endpoint, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch patients')
      return res.json()
    },
    enabled: activeTab === "patients"
  })

  // Fetch owners from API based on selected branch
  const { data: ownersData = [], isLoading: isOwnersLoading } = useQuery({
    queryKey: ['/api/owners', selectedBranchId],
    queryFn: async () => {
      const endpoint = selectedBranchId 
        ? `/api/owners?branchId=${selectedBranchId}`
        : '/api/owners'
      const res = await fetch(endpoint, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch owners')
      return res.json()
    },
    enabled: activeTab === "clients"
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
        species: patient.species,
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

  // Filter patients based on search
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return transformedPatients
    
    const searchLower = searchTerm.toLowerCase()
    return transformedPatients.filter((patient: any) =>
      patient.name?.toLowerCase().includes(searchLower) ||
      patient.owner?.toLowerCase().includes(searchLower) ||
      patient.ownerPhone?.includes(searchTerm)
    )
  }, [transformedPatients, searchTerm])

  // Filter owners based on search
  const filteredOwners = useMemo(() => {
    if (!searchTerm) return transformedOwners
    
    const searchLower = searchTerm.toLowerCase()
    return transformedOwners.filter((owner: any) =>
      owner.name?.toLowerCase().includes(searchLower) ||
      owner.phone?.includes(searchTerm) ||
      owner.email?.toLowerCase().includes(searchLower)
    )
  }, [transformedOwners, searchTerm])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  if (showRegistrationForm) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('registrationTitle')}</h1>
            <p className="text-muted-foreground">{t('registrationSubtitle')}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowRegistrationForm(false)}
            data-testid="button-back-to-registry"
          >
            {t('backToRegistry')}
          </Button>
        </div>
        <PatientRegistrationForm />
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
        <Button 
          onClick={() => setShowRegistrationForm(true)}
          data-testid="button-new-patient"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('patients.add')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('patients.search', 'Поиск пациентов и клиентов')}</CardTitle>
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
          <Card>
            <CardContent className="p-0">
              {isOwnersLoading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredOwners.length === 0 ? (
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
                    {filteredOwners.map((owner: any) => (
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {/* TODO: View owner details */}}
                                  data-testid={`button-view-owner-${owner.id}`}
                                >
                                  <User className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('clients.viewDetails', 'Просмотр клиента')}</p>
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
          </Card>
        </TabsContent>

        <TabsContent value="patients">
          <Card>
            <CardContent className="p-0">
              {isPatientsLoading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredPatients.length === 0 ? (
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
                    {filteredPatients.map((patient: any) => (
                      <PatientTableRow key={patient.id} patient={patient} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
