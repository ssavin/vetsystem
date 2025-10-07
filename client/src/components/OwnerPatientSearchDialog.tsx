import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, User, Phone, Mail, MapPin } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface Patient {
  id: string
  name: string
  species: string
  breed?: string
}

interface OwnerWithPatients {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  branchId?: string
  patients: Patient[]
}

interface SearchResult {
  owners: OwnerWithPatients[]
  total: number
}

interface OwnerPatientSearchDialogProps {
  onSelectPatient: (patientId: string, patientName: string, ownerId: string, ownerName: string) => void
  placeholder?: string
  minSearchLength?: number
  showAutocomplete?: boolean
}

export default function OwnerPatientSearchDialog({
  onSelectPatient,
  placeholder = "Поиск по ФИО владельца или кличке животного...",
  minSearchLength = 2,
  showAutocomplete = false
}: OwnerPatientSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Fetch search results
  const { data: searchData, isLoading } = useQuery<SearchResult>({
    queryKey: ['/api/owners/search-with-patients', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < minSearchLength) {
        return { owners: [], total: 0 }
      }
      const res = await fetch(`/api/owners/search-with-patients?query=${encodeURIComponent(debouncedSearch)}&limit=30`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to search owners')
      return res.json()
    },
    enabled: debouncedSearch.length >= minSearchLength,
  })

  const handlePatientSelect = (patient: Patient, owner: OwnerWithPatients) => {
    onSelectPatient(patient.id, patient.name, owner.id, owner.name)
    setSearchQuery("")
    setIsOpen(false)
  }

  useEffect(() => {
    if (showAutocomplete && debouncedSearch.length >= minSearchLength) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [debouncedSearch, minSearchLength, showAutocomplete])

  const getSpeciesLabel = (species: string) => {
    const labels: Record<string, string> = {
      cat: "Кошка",
      dog: "Собака",
      rabbit: "Кролик",
      bird: "Птица",
      hamster: "Хомяк",
      other: "Другое"
    }
    return labels[species] || species
  }

  // Autocomplete mode - compact dropdown
  if (showAutocomplete) {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-owner-patient"
        />
        
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">Поиск...</div>
            ) : searchData && searchData.total > 0 ? (
              <div className="py-1">
                {searchData.owners.map((owner) => (
                  <div key={owner.id}>
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                      {owner.name}
                      {owner.phone && <span className="ml-2 text-muted-foreground/70">{owner.phone}</span>}
                    </div>
                    {owner.patients && owner.patients.map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => handlePatientSelect(patient, owner)}
                        className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                        data-testid={`item-patient-${patient.id}`}
                      >
                        <div className="font-medium text-sm">{patient.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {getSpeciesLabel(patient.species)}
                          {patient.breed && ` • ${patient.breed}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-muted-foreground">Ничего не найдено</div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Full dialog mode - original layout
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-owner-patient"
        />
      </div>

      {searchQuery.length > 0 && searchQuery.length < minSearchLength && (
        <p className="text-sm text-muted-foreground">
          Введите минимум {minSearchLength} символа для поиска
        </p>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Поиск...</div>
        </div>
      )}

      {searchData && searchData.total > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Найдено: {searchData.total} {searchData.total === 1 ? 'владелец' : 'владельцев'}
          </div>
          <ScrollArea className="h-[400px] rounded-md border">
            <div className="p-4 space-y-3">
              {searchData.owners.map((owner) => (
                <Card key={owner.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">{owner.name}</h4>
                        <div className="space-y-1">
                          {owner.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{owner.phone}</span>
                            </div>
                          )}
                          {owner.email && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{owner.email}</span>
                            </div>
                          )}
                          {owner.address && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{owner.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {owner.patients && owner.patients.length > 0 && (
                      <div className="space-y-2 mt-3 pt-3 border-t">
                        <div className="text-xs font-medium text-muted-foreground">Пациенты:</div>
                        {owner.patients.map((patient) => (
                          <Button
                            key={patient.id}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => handlePatientSelect(patient, owner)}
                            data-testid={`button-select-patient-${patient.id}`}
                          >
                            <span className="font-medium">{patient.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {getSpeciesLabel(patient.species)}
                            </Badge>
                            {patient.breed && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {patient.breed}
                              </span>
                            )}
                          </Button>
                        ))}
                      </div>
                    )}

                    {(!owner.patients || owner.patients.length === 0) && (
                      <div className="text-xs text-muted-foreground italic mt-2">
                        Нет зарегистрированных пациентов
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {searchData && searchData.total === 0 && debouncedSearch.length >= minSearchLength && !isLoading && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Search className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Ничего не найдено по запросу "{debouncedSearch}"
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Попробуйте изменить поисковый запрос
          </p>
        </div>
      )}
    </div>
  )
}
