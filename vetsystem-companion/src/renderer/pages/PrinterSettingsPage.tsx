import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Printer, CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function PrinterSettingsPage() {
  const { toast } = useToast();
  const [printerModel, setPrinterModel] = useState<string>("");
  const [printerPort, setPrinterPort] = useState<string>("");
  const [availablePorts, setAvailablePorts] = useState<Array<{ device: string; description: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [loadingPorts, setLoadingPorts] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadComPorts();
  }, []);

  const loadSettings = async () => {
    try {
      const model = await window.api.getSetting('printerModel');
      const port = await window.api.getSetting('printerPort');
      if (model) setPrinterModel(model);
      if (port) setPrinterPort(port);
    } catch (error) {
      console.error('Error loading printer settings:', error);
    }
  };

  const loadComPorts = async () => {
    setLoadingPorts(true);
    try {
      const result = await window.api.listComPorts();
      if (result.success && result.ports) {
        setAvailablePorts(result.ports);
      } else {
        toast({
          title: "Ошибка",
          description: result.message || "Не удалось загрузить список портов",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить список портов",
        variant: "destructive"
      });
    } finally {
      setLoadingPorts(false);
    }
  };

  const handleSave = async () => {
    if (!printerModel) {
      toast({
        title: "Ошибка",
        description: "Выберите модель принтера",
        variant: "destructive"
      });
      return;
    }

    if (!printerPort) {
      toast({
        title: "Ошибка",
        description: "Выберите COM-порт",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await window.api.setSetting('printerModel', printerModel);
      await window.api.setSetting('printerPort', printerPort);
      
      toast({
        title: "Успешно",
        description: "Настройки принтера сохранены",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить настройки",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!printerPort) {
      toast({
        title: "Ошибка",
        description: "Выберите COM-порт для тестирования",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    try {
      const result = await window.api.testPrinterConnection(printerPort);
      
      if (result.success) {
        toast({
          title: "Успешно",
          description: result.message || "Порт доступен",
        });
      } else {
        toast({
          title: "Ошибка подключения",
          description: result.message || "Не удалось подключиться к принтеру",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Ошибка тестирования подключения",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Настройки фискального принтера</h1>
        <p className="text-muted-foreground mt-2">
          Настройте прямую печать чеков на фискальный принтер через COM-порт
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Конфигурация принтера
          </CardTitle>
          <CardDescription>
            Выберите модель принтера и COM-порт для печати фискальных чеков
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Модель принтера */}
          <div className="space-y-2">
            <Label htmlFor="printer-model">Модель принтера</Label>
            <Select
              value={printerModel}
              onValueChange={setPrinterModel}
            >
              <SelectTrigger id="printer-model" data-testid="select-printer-model">
                <SelectValue placeholder="Выберите модель принтера" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vikiprint">Vikiprint 57</SelectItem>
                <SelectItem value="atol">ATOL 30F</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Поддерживаемые модели: Vikiprint 57, ATOL 30F
            </p>
          </div>

          {/* COM-порт */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="printer-port">COM-порт</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadComPorts}
                disabled={loadingPorts}
                data-testid="button-refresh-ports"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingPorts ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>
            <Select
              value={printerPort}
              onValueChange={setPrinterPort}
              disabled={loadingPorts}
            >
              <SelectTrigger id="printer-port" data-testid="select-com-port">
                <SelectValue placeholder={loadingPorts ? "Загрузка портов..." : "Выберите COM-порт"} />
              </SelectTrigger>
              <SelectContent>
                {availablePorts.length === 0 && !loadingPorts && (
                  <SelectItem value="none" disabled>Порты не найдены</SelectItem>
                )}
                {availablePorts.map(port => (
                  <SelectItem key={port.device} value={port.device}>
                    {port.device} - {port.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Порт, к которому подключен принтер (например, COM3)
            </p>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isLoading || !printerModel || !printerPort}
              data-testid="button-save-printer-settings"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Сохранить настройки
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !printerPort}
              data-testid="button-test-printer"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Тестирование...
                </>
              ) : (
                "Проверить подключение"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Информация о настройке */}
      <Card>
        <CardHeader>
          <CardTitle>Инструкция по подключению</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">1. Подключите принтер</h3>
            <p className="text-sm text-muted-foreground">
              Подключите фискальный принтер к компьютеру через USB. Принтер будет определен как виртуальный COM-порт.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">2. Установите драйверы (если необходимо)</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><strong>Vikiprint 57:</strong> Драйвер VikiDriver с сайта Dreamkas</li>
              <li><strong>ATOL 30F:</strong> Драйвер ATOL KKT (8.x/9.x/10.x)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">3. Найдите COM-порт</h3>
            <p className="text-sm text-muted-foreground">
              Откройте Диспетчер устройств Windows → Порты (COM и LPT) → найдите ваш принтер и запомните номер порта.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">4. Настройте в Companion</h3>
            <p className="text-sm text-muted-foreground">
              Выберите модель принтера, выберите COM-порт, нажмите "Проверить подключение", затем "Сохранить настройки".
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm">
              <strong>⚠️ Важно:</strong> Текущая реализация использует базовую печать текстовых чеков.
              Для полной фискальной функциональности (с фискальной памятью и ОФД) требуются официальные драйверы и фискализация принтера.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
