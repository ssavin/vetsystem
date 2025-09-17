import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  Brain, 
  Stethoscope, 
  Camera, 
  FileText, 
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Upload,
  Loader2
} from "lucide-react"

interface AIAssistantProps {
  patientData?: {
    species: string
    breed?: string
    age: number
    weight?: number
    name: string
  }
  onSuggestionApply?: (suggestion: any) => void
}

export default function AIAssistant({ patientData, onSuggestionApply }: AIAssistantProps) {
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'soap' | 'image' | 'treatment' | 'chat'>('diagnosis')
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const { toast } = useToast()

  // Диагностический анализ
  const [diagnosisData, setDiagnosisData] = useState({
    complaints: '',
    symptoms: '',
    medicalHistory: '',
    temperature: ''
  })

  const diagnosisMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Отправка данных для анализа симптомов:', data)
      const requestBody = {
        species: patientData?.species || 'собака',
        breed: patientData?.breed,
        age: patientData?.age || 1,
        weight: patientData?.weight,
        ...data,
        temperature: data.temperature ? parseFloat(data.temperature) : undefined
      }
      console.log('Тело запроса:', requestBody)
      
      const response = await apiRequest('/api/ai/analyze-symptoms', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })
      
      console.log('Ответ от API:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Ошибка API:', errorText)
        throw new Error(`Ошибка анализа симптомов: ${errorText}`)
      }
      
      const result = await response.json()
      console.log('Результат анализа:', result)
      return result
    },
    onSuccess: (data) => {
      console.log('Успешно получены результаты анализа:', data)
      toast({
        title: "Анализ завершен",
        description: "ИИ-ассистент проанализировал симптомы и предоставил рекомендации"
      })
    },
    onError: (error: any) => {
      console.error('Ошибка мутации:', error)
      toast({
        title: "Ошибка анализа",
        description: error.message || "Произошла ошибка при анализе симптомов",
        variant: "destructive"
      })
    }
  })

  // SOAP генерация
  const [soapData, setSoapData] = useState({
    complaints: '',
    examination: '',
    vitals: '',
    diagnosis: '',
    treatment: ''
  })

  const soapMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/ai/generate-soap', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Ошибка генерации SOAP')
      return response.json()
    }
  })

  // Анализ изображений
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageType, setImageType] = useState<'xray' | 'wound' | 'skin' | 'dental' | 'other'>('other')
  const [imageContext, setImageContext] = useState('')

  const imageMutation = useMutation({
    mutationFn: async (data: { base64Image: string; imageType: string; context: string }) => {
      const response = await apiRequest('/api/ai/analyze-image', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Ошибка анализа изображения')
      return response.json()
    }
  })

  // План лечения
  const [treatmentData, setTreatmentData] = useState({
    diagnosis: '',
    allergies: '',
    currentMedications: '',
    medicalHistory: ''
  })

  const treatmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/ai/treatment-plan', {
        method: 'POST',
        body: JSON.stringify({
          species: patientData?.species || 'собака',
          breed: patientData?.breed,
          age: patientData?.age || 1,
          weight: patientData?.weight,
          ...data
        }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Ошибка создания плана лечения')
      return response.json()
    }
  })

  // Чат-консультант
  const chatMutation = useMutation({
    mutationFn: async (data: { question: string; conversationHistory?: any[] }) => {
      const response = await apiRequest('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Ошибка ИИ-консультанта')
      return response.json()
    },
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, 
        { role: 'user', content: currentQuestion },
        { role: 'assistant', content: data.response }
      ])
      setCurrentQuestion('')
    }
  })

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImageFile(file)
    
    // Конвертируем в base64
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      imageMutation.mutate({
        base64Image: base64,
        imageType: imageType,
        context: imageContext
      })
    }
    reader.readAsDataURL(file)
  }

  const urgencyColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800', 
    high: 'bg-orange-100 text-orange-800',
    emergency: 'bg-red-100 text-red-800'
  }

  const severityIcons = {
    normal: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    mild: <Clock className="h-4 w-4 text-yellow-500" />,
    moderate: <AlertCircle className="h-4 w-4 text-orange-500" />,
    severe: <Zap className="h-4 w-4 text-red-500" />
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с информацией о пациенте */}
      {patientData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              ИИ-Ассистент для {patientData.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><strong>Вид:</strong> {patientData.species}</div>
              <div><strong>Порода:</strong> {patientData.breed || 'не указана'}</div>
              <div><strong>Возраст:</strong> {patientData.age} лет</div>
              <div><strong>Вес:</strong> {patientData.weight || 'не указан'} кг</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Навигация */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'diagnosis', label: 'Диагностика', icon: Stethoscope },
          { id: 'soap', label: 'SOAP заметки', icon: FileText },
          { id: 'image', label: 'Анализ изображений', icon: Camera },
          { id: 'treatment', label: 'План лечения', icon: Brain },
          { id: 'chat', label: 'ИИ-Консультант', icon: MessageCircle }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-2"
            data-testid={`button-ai-${tab.id}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Диагностический анализ */}
      {activeTab === 'diagnosis' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Анализ симптомов и диагностика
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Жалобы владельца</label>
                <Textarea
                  value={diagnosisData.complaints}
                  onChange={(e) => setDiagnosisData(prev => ({ ...prev, complaints: e.target.value }))}
                  placeholder="Опишите жалобы владельца..."
                  rows={3}
                  data-testid="textarea-ai-complaints"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Клинические симптомы</label>
                <Textarea
                  value={diagnosisData.symptoms}
                  onChange={(e) => setDiagnosisData(prev => ({ ...prev, symptoms: e.target.value }))}
                  placeholder="Перечислите наблюдаемые симптомы..."
                  rows={3}
                  data-testid="textarea-ai-symptoms"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Анамнез</label>
                <Textarea
                  value={diagnosisData.medicalHistory}
                  onChange={(e) => setDiagnosisData(prev => ({ ...prev, medicalHistory: e.target.value }))}
                  placeholder="История болезней, прививки..."
                  rows={2}
                  data-testid="textarea-ai-history"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Температура (°C)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={diagnosisData.temperature}
                  onChange={(e) => setDiagnosisData(prev => ({ ...prev, temperature: e.target.value }))}
                  placeholder="38.5"
                  data-testid="input-ai-temperature"
                />
              </div>
            </div>
            
            <Button
              onClick={() => diagnosisMutation.mutate(diagnosisData)}
              disabled={diagnosisMutation.isPending || !diagnosisData.complaints || !diagnosisData.symptoms}
              className="w-full"
              data-testid="button-analyze-symptoms"
            >
              {diagnosisMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Анализирую...</>
              ) : (
                <><Brain className="h-4 w-4 mr-2" /> Проанализировать симптомы</>
              )}
            </Button>

            {/* Результаты анализа */}
            {diagnosisMutation.data && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Результаты анализа ИИ</h3>
                  <Badge className={urgencyColors[diagnosisMutation.data.urgencyLevel]}>
                    {diagnosisMutation.data.urgencyLevel === 'emergency' ? 'Экстренно' :
                     diagnosisMutation.data.urgencyLevel === 'high' ? 'Высокая' :
                     diagnosisMutation.data.urgencyLevel === 'medium' ? 'Средняя' : 'Низкая'} срочность
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Дифференциальная диагностика</h4>
                    <ul className="space-y-1 text-sm">
                      {diagnosisMutation.data.differentialDiagnoses.map((diagnosis: string, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <AlertCircle className="h-3 w-3 text-blue-500" />
                          {diagnosis}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Рекомендуемые исследования</h4>
                    <ul className="space-y-1 text-sm">
                      {diagnosisMutation.data.recommendedTests.map((test: string, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {test}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Обоснование</h4>
                  <p className="text-sm text-muted-foreground">{diagnosisMutation.data.reasoning}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Предварительные рекомендации по лечению</h4>
                  <ul className="space-y-1 text-sm">
                    {diagnosisMutation.data.treatmentSuggestions.map((suggestion: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <Stethoscope className="h-3 w-3 text-purple-500" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Brain className="h-3 w-3" />
                  Уверенность ИИ: {Math.round(diagnosisMutation.data.confidence * 100)}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Остальные вкладки ИИ */}
      {activeTab === 'soap' && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Автогенерация SOAP заметок - в разработке</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'image' && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Анализ медицинских изображений - в разработке</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'treatment' && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Персонализированный план лечения - в разработке</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'chat' && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>ИИ-Консультант для владельцев - в разработке</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}