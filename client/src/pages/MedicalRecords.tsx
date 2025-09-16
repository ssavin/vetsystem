import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Plus, Filter, Calendar } from "lucide-react"
import MedicalRecordCard from "@/components/MedicalRecordCard"

// TODO: Remove mock data when connecting to real backend
const mockRecords = [
  {
    id: "1",
    date: "15.12.2024",
    patientName: "Барсик",
    doctorName: "Доктор Петрова",
    visitType: "Плановый осмотр",
    complaints: "Снижение аппетита, вялость в течение 3 дней",
    diagnosis: "Острый гастрит",
    treatment: [
      "Общий клинический осмотр",
      "Взятие крови на анализ", 
      "УЗИ брюшной полости"
    ],
    medications: [
      {
        name: "Омепразол",
        dosage: "20 мг",
        frequency: "2 раза в день",
        duration: "7 дней"
      },
      {
        name: "Пробиотик",
        dosage: "1 капсула",
        frequency: "1 раз в день",
        duration: "14 дней"
      }
    ],
    nextVisit: "22.12.2024",
    status: 'active' as const,
    notes: "Рекомендована диета, исключить сухой корм на время лечения",
    temperature: "38.5",
    weight: "4.2"
  },
  {
    id: "2",
    date: "14.12.2024",
    patientName: "Рекс",
    doctorName: "Доктор Иванов",
    visitType: "Вакцинация",
    complaints: "Плановая вакцинация",
    diagnosis: "Здоровое животное",
    treatment: [
      "Предвакцинальный осмотр",
      "Вакцинация против бешенства",
      "Вакцинация комплексной вакциной"
    ],
    medications: [],
    nextVisit: "14.01.2025",
    status: 'completed' as const,
    temperature: "38.2",
    weight: "28.5"
  },
  {
    id: "3",
    date: "12.12.2024",
    patientName: "Мурка",
    doctorName: "Доктор Сидоров",
    visitType: "Консультация",
    complaints: "Хромота на заднюю лапу после прыжка",
    diagnosis: "Растяжение связок",
    treatment: [
      "Клинический осмотр",
      "Пальпация конечности",
      "Рентгенография (исключен перелом)"
    ],
    medications: [
      {
        name: "Римадил",
        dosage: "25 мг",
        frequency: "1 раз в день",
        duration: "5 дней"
      }
    ],
    nextVisit: "19.12.2024",
    status: 'follow-up' as const,
    notes: "Ограничить активность на 1 неделю",
    temperature: "38.3",
    weight: "3.8"
  }
]

export default function MedicalRecords() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredRecords, setFilteredRecords] = useState(mockRecords)

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (!term) {
      setFilteredRecords(mockRecords)
    } else {
      const filtered = mockRecords.filter(record => 
        record.patientName.toLowerCase().includes(term.toLowerCase()) ||
        record.doctorName.toLowerCase().includes(term.toLowerCase()) ||
        record.diagnosis.toLowerCase().includes(term.toLowerCase())
      )
      setFilteredRecords(filtered)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-medical-records-title">Электронные медицинские карты</h1>
          <p className="text-muted-foreground">История болезней и медицинские записи пациентов</p>
        </div>
        <Button data-testid="button-new-record">
          <Plus className="h-4 w-4 mr-2" />
          Новая запись
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Поиск медицинских записей</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по пациенту, врачу или диагнозу..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-records"
              />
            </div>
            <Button variant="outline" data-testid="button-filter-records">
              <Filter className="h-4 w-4 mr-2" />
              Фильтры
            </Button>
            <Button variant="outline" data-testid="button-date-range">
              <Calendar className="h-4 w-4 mr-2" />
              Период
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600" data-testid="text-active-treatments">
                {mockRecords.filter(r => r.status === 'active').length}
              </p>
              <p className="text-xs text-muted-foreground">Активное лечение</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600" data-testid="text-follow-up">
                {mockRecords.filter(r => r.status === 'follow-up').length}
              </p>
              <p className="text-xs text-muted-foreground">Требует наблюдения</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600" data-testid="text-completed-treatments">
                {mockRecords.filter(r => r.status === 'completed').length}
              </p>
              <p className="text-xs text-muted-foreground">Завершенных случаев</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medical Records List */}
      <div className="space-y-4">
        {filteredRecords.map(record => (
          <MedicalRecordCard key={record.id} record={record} />
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-muted-foreground">
              {searchTerm ? 'Медицинские записи не найдены' : 'Медицинские записи отсутствуют'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}