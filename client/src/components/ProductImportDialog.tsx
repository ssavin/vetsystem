import { useState, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProductImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ProductImportDialog({ open, onOpenChange }: ProductImportDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null)

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Не удалось загрузить файл')
      }
      
      return await response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] })
      setImportResult(data)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      toast({
        title: "Импорт завершен",
        description: `Успешно загружено товаров: ${data.success}`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка импорта",
        description: error.message || "Не удалось импортировать товары",
        variant: "destructive"
      })
    }
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Проверяем расширение файла
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension !== 'xls' && extension !== 'xlsx') {
        toast({
          title: "Неверный формат файла",
          description: "Пожалуйста, выберите файл Excel (.xls или .xlsx)",
          variant: "destructive"
        })
        return
      }
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile)
    }
  }

  const handleDownloadTemplate = () => {
    // Создаем ссылку для скачивания шаблона
    window.open('/api/products/import/template', '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle data-testid="text-import-dialog-title">Импорт товаров из Excel</DialogTitle>
          <DialogDescription>
            Загрузите файл Excel с товарами для массового импорта
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Инструкция */}
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              <strong>Скачайте шаблон ниже</strong> - он содержит примеры товаров и подробную инструкцию 
              по заполнению. Заполните лист "Примеры" своими товарами и загрузите файл обратно.
            </AlertDescription>
          </Alert>

          {/* Кнопка скачивания шаблона */}
          <Button 
            variant="outline" 
            onClick={handleDownloadTemplate}
            className="w-full"
            data-testid="button-download-template"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Скачать шаблон Excel
          </Button>

          {/* Выбор файла */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file-upload"
            />
            
            {!selectedFile ? (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  Выберите файл Excel для загрузки
                </div>
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-select-file"
                >
                  Выбрать файл
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                <div className="text-sm font-medium">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} КБ
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  data-testid="button-clear-file"
                >
                  Выбрать другой файл
                </Button>
              </div>
            )}
          </div>

          {/* Результаты импорта */}
          {importResult && (
            <Alert variant={importResult.errors.length > 0 ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">
                  Импортировано товаров: {importResult.success}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-sm space-y-1">
                    <div className="font-medium">Ошибки:</div>
                    {importResult.errors.slice(0, 5).map((error, i) => (
                      <div key={i} className="text-xs">• {error}</div>
                    ))}
                    {importResult.errors.length > 5 && (
                      <div className="text-xs">
                        ... и ещё {importResult.errors.length - 5} ошибок
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Закрыть
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
              data-testid="button-import"
            >
              {importMutation.isPending ? "Импорт..." : "Импортировать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
