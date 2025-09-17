import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Brain, Loader2 } from "lucide-react"

export default function AITestPage() {
  const [testData, setTestData] = useState({
    complaints: 'Собака хромает на левую лапу уже третий день',
    symptoms: 'Припухлость сустава, болезненность при пальпации, хромота',
    temperature: '38.5'
  })
  const { toast } = useToast()

  const testMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🧪 Тестирование AI API с данными:', data)
      const response = await fetch('/api/ai/analyze-symptoms', {
        method: 'POST',
        body: JSON.stringify({
          species: 'собака',
          breed: 'немецкая овчарка',
          age: 5,
          weight: 30,
          ...data,
          temperature: data.temperature ? parseFloat(data.temperature) : undefined
        }),
        headers: { 
          'Content-Type': 'application/json',
          'credentials': 'include'
        },
        credentials: 'include'
      })
      
      console.log('🔍 Статус ответа:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Ошибка API:', errorText)
        throw new Error(`API Error: ${errorText}`)
      }
      
      const result = await response.json()
      console.log('✅ Результат:', result)
      return result
    },
    onSuccess: (data) => {
      toast({
        title: "Тест пройден",
        description: "ИИ вернул результаты анализа"
      })
    },
    onError: (error: any) => {
      console.error('💥 Ошибка мутации:', error)
      toast({
        title: "Тест провален",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            Тестирование ИИ API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Жалобы владельца</label>
            <Textarea
              value={testData.complaints}
              onChange={(e) => setTestData(prev => ({ ...prev, complaints: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Клинические симптомы</label>
            <Textarea
              value={testData.symptoms}
              onChange={(e) => setTestData(prev => ({ ...prev, symptoms: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Температура (°C)</label>
            <Input
              type="number"
              step="0.1"
              value={testData.temperature}
              onChange={(e) => setTestData(prev => ({ ...prev, temperature: e.target.value }))}
            />
          </div>
          
          <Button
            onClick={() => testMutation.mutate(testData)}
            disabled={testMutation.isPending}
            className="w-full"
          >
            {testMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Тестирую...</>
            ) : (
              <><Brain className="h-4 w-4 mr-2" /> Тестировать ИИ API</>
            )}
          </Button>

          {/* Результаты */}
          {testMutation.data && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold mb-2">✅ Тест успешно пройден!</h3>
              <pre className="text-sm bg-white p-2 rounded border overflow-auto">
                {JSON.stringify(testMutation.data, null, 2)}
              </pre>
            </div>
          )}
          
          {testMutation.error && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <h3 className="font-semibold mb-2">❌ Тест провален</h3>
              <p className="text-sm text-red-600">
                {String(testMutation.error)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}