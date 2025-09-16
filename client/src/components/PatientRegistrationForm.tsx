import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { CalendarIcon, Save, X } from "lucide-react"
import { useState } from "react"

interface PatientData {
  name: string
  species: string
  breed: string
  gender: string
  birthDate: string
  color: string
  weight: string
  microchipNumber: string
  isNeutered: boolean
  allergies: string
  chronicConditions: string
  specialMarks: string
  ownerName: string
  ownerPhone: string
  ownerEmail: string
  ownerAddress: string
  notes: string
}

export default function PatientRegistrationForm() {
  const [formData, setFormData] = useState<PatientData>({
    name: '',
    species: '',
    breed: '',
    gender: '',
    birthDate: '',
    color: '',
    weight: '',
    microchipNumber: '',
    isNeutered: false,
    allergies: '',
    chronicConditions: '',
    specialMarks: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    ownerAddress: '',
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Patient registration form submitted:', formData)
    // Reset form
    setFormData({
      name: '',
      species: '',
      breed: '',
      gender: '',
      birthDate: '',
      color: '',
      weight: '',
      microchipNumber: '',
      isNeutered: false,
      allergies: '',
      chronicConditions: '',
      specialMarks: '',
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
      ownerAddress: '',
      notes: ''
    })
  }

  const updateField = (field: keyof PatientData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Регистрация пациента</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Кличка *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Введите кличку животного"
                required
                data-testid="input-patient-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="species">Вид *</Label>
              <Select value={formData.species} onValueChange={(value) => updateField('species', value)}>
                <SelectTrigger data-testid="select-species">
                  <SelectValue placeholder="Выберите вид" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cat">Кошка</SelectItem>
                  <SelectItem value="dog">Собака</SelectItem>
                  <SelectItem value="rabbit">Кролик</SelectItem>
                  <SelectItem value="bird">Птица</SelectItem>
                  <SelectItem value="hamster">Хомяк</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="breed">Порода</Label>
              <Input
                id="breed"
                value={formData.breed}
                onChange={(e) => updateField('breed', e.target.value)}
                placeholder="Введите породу"
                data-testid="input-breed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Пол</Label>
              <Select value={formData.gender} onValueChange={(value) => updateField('gender', value)}>
                <SelectTrigger data-testid="select-gender">
                  <SelectValue placeholder="Выберите пол" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Мужской</SelectItem>
                  <SelectItem value="female">Женский</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Дата рождения</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => updateField('birthDate', e.target.value)}
                data-testid="input-birth-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Окрас</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => updateField('color', e.target.value)}
                placeholder="Описание окраса"
                data-testid="input-color"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Вес (кг)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => updateField('weight', e.target.value)}
                placeholder="0.0"
                data-testid="input-weight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="microchip">Номер чипа</Label>
              <Input
                id="microchip"
                value={formData.microchipNumber}
                onChange={(e) => updateField('microchipNumber', e.target.value)}
                placeholder="Номер микрочипа"
                data-testid="input-microchip"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="neutered"
              checked={formData.isNeutered}
              onCheckedChange={(checked) => updateField('isNeutered', checked as boolean)}
              data-testid="checkbox-neutered"
            />
            <Label htmlFor="neutered">Кастрирован/стерилизован</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergies">Аллергии</Label>
            <Textarea
              id="allergies"
              value={formData.allergies}
              onChange={(e) => updateField('allergies', e.target.value)}
              placeholder="Известные аллергии..."
              data-testid="textarea-allergies"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chronic">Хронические заболевания</Label>
            <Textarea
              id="chronic"
              value={formData.chronicConditions}
              onChange={(e) => updateField('chronicConditions', e.target.value)}
              placeholder="Хронические заболевания..."
              data-testid="textarea-chronic"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marks">Особые приметы</Label>
            <Textarea
              id="marks"
              value={formData.specialMarks}
              onChange={(e) => updateField('specialMarks', e.target.value)}
              placeholder="Шрамы, особые отметки..."
              data-testid="textarea-marks"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Информация о владельце</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ownerName">ФИО владельца *</Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) => updateField('ownerName', e.target.value)}
                placeholder="Фамилия Имя Отчество"
                required
                data-testid="input-owner-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerPhone">Телефон *</Label>
              <Input
                id="ownerPhone"
                type="tel"
                value={formData.ownerPhone}
                onChange={(e) => updateField('ownerPhone', e.target.value)}
                placeholder="+7 (999) 123-45-67"
                required
                data-testid="input-owner-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Email</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => updateField('ownerEmail', e.target.value)}
                placeholder="email@example.com"
                data-testid="input-owner-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerAddress">Адрес</Label>
              <Input
                id="ownerAddress"
                value={formData.ownerAddress}
                onChange={(e) => updateField('ownerAddress', e.target.value)}
                placeholder="Адрес проживания"
                data-testid="input-owner-address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Дополнительные заметки</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Дополнительная информация..."
              data-testid="textarea-notes"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button type="button" variant="outline" data-testid="button-cancel">
          <X className="h-4 w-4 mr-2" />
          Отменить
        </Button>
        <Button type="submit" data-testid="button-save-patient">
          <Save className="h-4 w-4 mr-2" />
          Сохранить пациента
        </Button>
      </div>
    </form>
  )
}