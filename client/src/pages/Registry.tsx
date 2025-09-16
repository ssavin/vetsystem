import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Plus, Filter } from "lucide-react"
import PatientCard from "@/components/PatientCard"
import PatientRegistrationForm from "@/components/PatientRegistrationForm"

// TODO: Remove mock data when connecting to real backend
const mockPatients = [
  {
    id: "1",
    name: "Барсик",
    species: "Кот",
    breed: "Персидская",
    age: "3 года",
    owner: "Иванов И.И.",
    ownerPhone: "+7 (999) 123-45-67",
    status: 'healthy' as const,
    lastVisit: "15.12.2024"
  },
  {
    id: "2",
    name: "Рекс",
    species: "Собака", 
    breed: "Немецкая овчарка",
    age: "5 лет",
    owner: "Сидоров П.К.",
    ownerPhone: "+7 (999) 987-65-43",
    status: 'treatment' as const,
    lastVisit: "14.12.2024"
  },
  {
    id: "3",
    name: "Мурка",
    species: "Кошка",
    breed: "Британская",
    age: "2 года",
    owner: "Петрова А.С.",
    ownerPhone: "+7 (999) 555-12-34",
    status: 'healthy' as const,
    lastVisit: "12.12.2024"
  }
]

export default function Registry() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [filteredPatients, setFilteredPatients] = useState(mockPatients)

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (!term) {
      setFilteredPatients(mockPatients)
    } else {
      const filtered = mockPatients.filter(patient => 
        patient.name.toLowerCase().includes(term.toLowerCase()) ||
        patient.owner.toLowerCase().includes(term.toLowerCase()) ||
        patient.ownerPhone.includes(term)
      )
      setFilteredPatients(filtered)
    }
  }

  if (showRegistrationForm) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Регистрация нового пациента</h1>
            <p className="text-muted-foreground">Добавление животного в базу данных</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowRegistrationForm(false)}
            data-testid="button-back-to-registry"
          >
            Назад к списку
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
          <h1 className="text-3xl font-bold" data-testid="text-registry-title">Регистратура</h1>
          <p className="text-muted-foreground">Управление клиентской базой и пациентами</p>
        </div>
        <Button 
          onClick={() => setShowRegistrationForm(true)}
          data-testid="button-new-patient"
        >
          <Plus className="h-4 w-4 mr-2" />
          Новый пациент
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Поиск пациентов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по кличке, владельцу или телефону..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-patients"
              />
            </div>
            <Button variant="outline" data-testid="button-filters">
              <Filter className="h-4 w-4 mr-2" />
              Фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPatients.map(patient => (
          <PatientCard key={patient.id} patient={patient} />
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-muted-foreground">
              {searchTerm ? 'Пациенты не найдены' : 'Пациенты отсутствуют'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}