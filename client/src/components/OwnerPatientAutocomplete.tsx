import { useState, useEffect, useRef } from "react"
import { Check, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (patient: Patient) => {
    setSelectedPatient(patient)
    onSelect(patient.id, patient)
    setSearchQuery("")
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    setIsOpen(query.length >= 2)
  }

  const showDropdown = isOpen && searchQuery.length >= 2

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => searchQuery.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9"
          data-testid="input-autocomplete-search"
        />
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-[300px] overflow-y-auto"
          data-testid="dropdown-autocomplete-results"
        >
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Поиск...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Ничего не найдено
            </div>
          ) : (
            <div className="py-1">
              {searchResults.map((owner) => (
                <div key={owner.id}>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                    {owner.name}
                    {owner.phone && (
                      <span className="ml-2 text-muted-foreground/70">
                        {owner.phone}
                      </span>
                    )}
                  </div>
                  {owner.patients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => handleSelect(patient)}
                      className="px-3 py-2 cursor-pointer hover-elevate active-elevate-2 flex items-center gap-2"
                      data-testid={`item-patient-${patient.id}`}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
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
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
