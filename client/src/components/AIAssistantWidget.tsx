import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mic, MicOff, Loader2, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

type AIAction = 
  | 'OPEN_PATIENT_CARD'
  | 'FILL_FORM_DATA'
  | 'FIND_APPOINTMENT_SLOT'
  | 'CREATE_APPOINTMENT'
  | 'NO_ACTION';

interface AICommand {
  action: AIAction;
  payload: Record<string, any>;
}

interface AIAssistantWidgetProps {
  role: 'admin' | 'doctor';
  onFillForm?: (data: Record<string, any>) => void;
  className?: string;
}

type WidgetState = 'idle' | 'listening' | 'processing' | 'suggestion';

export function AIAssistantWidget({ role, onFillForm, className = '' }: AIAssistantWidgetProps) {
  const [widgetState, setWidgetState] = useState<WidgetState>('idle');
  const [suggestion, setSuggestion] = useState<AICommand | null>(null);
  const { transcript, isListening, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const analyzeTranscriptMutation = useMutation<AICommand, Error, { transcript: string; role: 'admin' | 'doctor' }>({
    mutationFn: async (data) => {
      const response = await apiRequest('POST', '/api/ai/assistant-command', data);
      return response as unknown as AICommand;
    },
    onSuccess: (command: AICommand) => {
      if (command.action === 'NO_ACTION') {
        setWidgetState('idle');
        toast({
          title: 'Нет действий',
          description: command.payload.message || 'AI не нашел подходящих действий',
        });
      } else {
        setSuggestion(command);
        setWidgetState('suggestion');
      }
    },
    onError: (error: any) => {
      setWidgetState('idle');
      resetTranscript();
      
      // Извлекаем сообщение об ошибке из ответа сервера
      const errorMessage = error?.message || 'Не удалось обработать запрос';
      
      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Auto-stop listening after 3 seconds of silence
  useEffect(() => {
    if (!isListening) return;

    const silenceTimer = setTimeout(() => {
      if (transcript && isListening) {
        stopListening();
        setWidgetState('processing');
        analyzeTranscriptMutation.mutate({ transcript, role });
      }
    }, 3000);

    return () => clearTimeout(silenceTimer);
  }, [transcript, isListening]);

  const handleMicClick = () => {
    if (widgetState === 'idle') {
      startListening();
      setWidgetState('listening');
    } else if (widgetState === 'listening') {
      stopListening();
      if (transcript) {
        setWidgetState('processing');
        analyzeTranscriptMutation.mutate({ transcript, role });
      } else {
        setWidgetState('idle');
      }
    }
  };

  const handleExecuteAction = () => {
    if (!suggestion) return;

    switch (suggestion.action) {
      case 'OPEN_PATIENT_CARD':
        const { ownerName, petName, ownerPhone } = suggestion.payload;
        // Navigate to registry with search params
        const searchQuery = petName || ownerName || ownerPhone || '';
        navigate(`/registry?search=${encodeURIComponent(searchQuery)}`);
        toast({
          title: 'Переход к карте',
          description: `Поиск: ${searchQuery}`,
        });
        break;

      case 'FILL_FORM_DATA':
        if (onFillForm) {
          onFillForm(suggestion.payload);
          toast({
            title: 'Данные заполнены',
            description: 'Проверьте заполненные поля',
          });
        } else {
          // Show the data to copy manually
          const dataText = Object.entries(suggestion.payload)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          toast({
            title: 'Данные для заполнения',
            description: (
              <pre className="text-xs mt-2 whitespace-pre-wrap">
                {dataText}
              </pre>
            ) as any,
            duration: 10000,
          });
        }
        break;

      case 'FIND_APPOINTMENT_SLOT':
        navigate(`/appointments?find=true&specialty=${suggestion.payload.doctorSpecialty || ''}`);
        toast({
          title: 'Поиск времени',
          description: 'Открыта страница записи',
        });
        break;

      case 'CREATE_APPOINTMENT':
        navigate(`/appointments?create=true`);
        toast({
          title: 'Создание записи',
          description: 'Заполните форму записи',
        });
        break;
    }

    // Reset state
    setSuggestion(null);
    setWidgetState('idle');
    resetTranscript();
  };

  const handleDismiss = () => {
    setSuggestion(null);
    setWidgetState('idle');
    resetTranscript();
  };

  if (!isSupported) {
    return null; // Don't show widget if speech recognition is not supported
  }

  const getSuggestionMessage = (cmd: AICommand): string => {
    switch (cmd.action) {
      case 'OPEN_PATIENT_CARD':
        const parts = [];
        if (cmd.payload.petName) parts.push(`пациент: ${cmd.payload.petName}`);
        if (cmd.payload.ownerName) parts.push(`владелец: ${cmd.payload.ownerName}`);
        if (cmd.payload.ownerPhone) parts.push(`телефон: ${cmd.payload.ownerPhone}`);
        return `Открыть карту (${parts.join(', ')})?`;
      
      case 'FILL_FORM_DATA':
        const fields = Object.keys(cmd.payload).length;
        return `Заполнить ${fields} ${fields === 1 ? 'поле' : 'полей'} в форме?`;
      
      case 'FIND_APPOINTMENT_SLOT':
        return `Найти свободное время ${cmd.payload.doctorSpecialty ? `для ${cmd.payload.doctorSpecialty}` : ''}?`;
      
      case 'CREATE_APPOINTMENT':
        return `Создать запись на приём?`;
      
      default:
        return 'Выполнить действие?';
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {widgetState === 'idle' && (
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={handleMicClick}
          data-testid="button-ai-assistant-mic"
        >
          <Mic className="h-6 w-6" />
        </Button>
      )}

      {widgetState === 'listening' && (
        <Card className="w-80 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="relative">
                <Mic className="h-5 w-5 text-destructive" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                </span>
              </div>
              Слушаю...
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm text-muted-foreground min-h-[60px]">
              {transcript || 'Начните говорить...'}
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMicClick}
              className="w-full"
              data-testid="button-stop-listening"
            >
              <MicOff className="h-4 w-4 mr-2" />
              Остановить
            </Button>
          </CardFooter>
        </Card>
      )}

      {widgetState === 'processing' && (
        <Card className="w-80 shadow-xl">
          <CardContent className="pt-6 pb-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Обработка запроса...</p>
          </CardContent>
        </Card>
      )}

      {widgetState === 'suggestion' && suggestion && (
        <Card className="w-80 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                AI предлагает действие
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleDismiss}
                data-testid="button-dismiss-suggestion"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm mb-3">{getSuggestionMessage(suggestion)}</p>
            {suggestion.action === 'FILL_FORM_DATA' && (
              <div className="text-xs text-muted-foreground space-y-1 bg-muted p-2 rounded">
                {Object.entries(suggestion.payload).map(([key, value]) => (
                  <div key={key}>
                    <strong>{key}:</strong> {String(value)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="flex-1"
              data-testid="button-cancel-suggestion"
            >
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteAction}
              className="flex-1"
              data-testid="button-execute-suggestion"
            >
              Выполнить
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
