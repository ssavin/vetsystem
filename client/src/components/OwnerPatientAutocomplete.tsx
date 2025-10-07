import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useQuery } from "@tanstack/react-query"

interface Owner {
  id: string
  name: string
  phone?: string
}

interface Patient {
  id: string
  name: string
  species?: string
  breed?: string
  ownerId: string
}

interface OwnerWithPatients extends Owner {
  patients: Patient[]
}

interface OwnerPatientAutocompleteProps {
  value?: string
  onSelect: (patientId: string, patient: Patient | null) => void
  placeholder?: string
  disabled?: boolean
}

export function OwnerPatientAutocomplete({
  value,
  onSelect,
  placeholder = "Поиск владельца или пациента...",
  disabled = false
}: OwnerPatientAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  const { data: searchResults = [], isLoading } = useQuery<OwnerWithPatients[]>({
    queryKey: ['/api/owners/search-with-patients', searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/owners/search-with-patients?query=${encodeURIComponent(searchQuery)}&limit=30`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to search')
      return res.json()
    },
    enabled: searchQuery.length >= 2,
  })

  // Clear selectedPatient and searchQuery when value is cleared from parent
  useEffect(() => {
    if (!value && (selectedPatient || searchQuery)) {
      setSelectedPatient(null)
      setSearchQuery("")
    }
  }, [value, selectedPatient, searchQuery])

  // Load patient data when value is set from parent
  useEffect(() => {
    if (value && !selectedPatient) {
      const allPatients = searchResults.flatMap(owner => owner.patients)
      const patient = allPatients.find(p => p.id === value)
      if (patient) {
        setSelectedPatient(patient)
      }
    }
  }, [value, searchResults, selectedPatient])

  const handleSelect = (patient: Patient) => {
    setSelectedPatient(patient)
    onSelect(patient.id, patient)
    setOpen(false)
  }

  const displayText = selectedPatient
    ? `${selectedPatient.name} (${selectedPatient.species || 'не указано'})`
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          data-testid="button-autocomplete-trigger"
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Введите имя владельца или кличку питомца..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            data-testid="input-autocomplete-search"
          />
          <CommandList>
            {searchQuery.length < 2 ? (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  Введите минимум 2 символа для поиска
                </div>
              </CommandEmpty>
            ) : isLoading ? (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Поиск...
                </div>
              </CommandEmpty>
            ) : searchResults.length === 0 ? (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Ничего не найдено
                </div>
              </CommandEmpty>
            ) : (
              searchResults.map((owner) => (
                <CommandGroup
                  key={owner.id}
                  heading={
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{owner.name}</span>
                      {owner.phone && (
                        <span className="text-xs text-muted-foreground">
                          {owner.phone}
                        </span>
                      )}
                    </div>
                  }
                >
                  {owner.patients.map((patient) => (
                    <CommandItem
                      key={patient.id}
                      value={patient.id}
                      onSelect={() => handleSelect(patient)}
                      className="cursor-pointer"
                      data-testid={`item-patient-${patient.id}`}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedPatient?.id === patient.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {patient.species || 'Не указано'}
                          {patient.breed && ` • ${patient.breed}`}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
