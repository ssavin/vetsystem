import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Loader2, PenLine } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { SignaturePad } from './SignaturePad';

interface PrintDocumentButtonProps {
  entityId: string;
  entityType: 'medical_record' | 'invoice' | 'encounter' | 'owner';
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

interface GenerateDocumentRequest {
  templateType: string;
  entityId: string;
  outputFormat: 'pdf' | 'html';
  signatureData?: string;
  signerName?: string;
}

const SIGNATURE_REQUIRED_TEMPLATES = new Set([
  'informed_consent_surgery',
  'informed_consent_anesthesia',
  'informed_consent_general',
  'service_agreement',
  'hospitalization_agreement',
  'personal_data_consent',
]);

export function PrintDocumentButton({
  entityId,
  entityType,
  variant = 'outline',
  size = 'sm',
  showLabel = false
}: PrintDocumentButtonProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [signatureModal, setSignatureModal] = useState<{ open: boolean; templateType: string; templateLabel: string }>({
    open: false,
    templateType: '',
    templateLabel: '',
  });
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');

  const generateDocumentMutation = useMutation({
    mutationFn: async (data: GenerateDocumentRequest) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate document');
      }

      return response.blob();
    },
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        };
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `document-${variables.entityId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({
          variant: 'destructive',
          title: 'Всплывающее окно заблокировано',
          description: 'Документ скачан. Разрешите всплывающие окна для автоматической печати.'
        });
        return;
      }
      toast({ title: 'Документ готов к печати', description: 'Откроется диалог печати' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Ошибка генерации', description: error.message });
    }
  });

  const handlePrintDocument = async (templateType: string) => {
    if (SIGNATURE_REQUIRED_TEMPLATES.has(templateType)) {
      setSignatureData(null);
      setSignerName('');
      setSignatureModal({ open: true, templateType, templateLabel: getTemplateLabel(templateType) });
      return;
    }
    try {
      setIsGenerating(true);
      await generateDocumentMutation.mutateAsync({ templateType, entityId, outputFormat: 'pdf' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWithSignature = async () => {
    if (!signatureData) {
      toast({ variant: 'destructive', title: 'Подпись обязательна', description: 'Пожалуйста, поставьте подпись' });
      return;
    }
    setSignatureModal(prev => ({ ...prev, open: false }));
    try {
      setIsGenerating(true);
      await generateDocumentMutation.mutateAsync({
        templateType: signatureModal.templateType,
        entityId,
        outputFormat: 'pdf',
        signatureData,
        signerName: signerName || undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getTemplateLabel = (value: string): string => {
    const allOptions = getAllTemplateOptions();
    return allOptions.find(o => o.value === value)?.label ?? value;
  };

  const getAllTemplateOptions = () => [
    { label: 'Медицинская карта', value: 'encounter_summary' },
    { label: 'Рецепт', value: 'prescription' },
    { label: 'Сертификат вакцинации', value: 'vaccination_certificate' },
    { label: 'Договор на вет. обслуживание', value: 'service_agreement' },
    { label: 'Договор на стационар', value: 'hospitalization_agreement' },
    { label: 'Информированное согласие (общее)', value: 'informed_consent_general' },
    { label: 'Информированное согласие (операция)', value: 'informed_consent_surgery' },
    { label: 'Информированное согласие (анестезия)', value: 'informed_consent_anesthesia' },
    { label: 'Счет-фактура', value: 'invoice' },
    { label: 'Протокол приема', value: 'encounter_summary' },
    { label: 'Результаты анализов', value: 'lab_results_report' },
    { label: 'Согласие на обработку ПД', value: 'personal_data_consent' },
  ];

  const getTemplateOptions = () => {
    switch (entityType) {
      case 'medical_record':
        return [
          { label: 'Медицинская карта', value: 'encounter_summary' },
          { label: 'Рецепт', value: 'prescription' },
          { label: 'Сертификат вакцинации', value: 'vaccination_certificate' },
          { label: 'Договор на вет. обслуживание', value: 'service_agreement' },
          { label: 'Договор на стационар', value: 'hospitalization_agreement' },
          { label: 'Информированное согласие', value: 'informed_consent_general' }
        ];
      case 'invoice':
        return [{ label: 'Счет-фактура', value: 'invoice' }];
      case 'encounter':
        return [
          { label: 'Протокол приема', value: 'encounter_summary' },
          { label: 'Результаты анализов', value: 'lab_results_report' }
        ];
      case 'owner':
        return [{ label: 'Согласие на обработку ПД', value: 'personal_data_consent' }];
      default:
        return [];
    }
  };

  const templateOptions = getTemplateOptions();

  const renderButton = () => {
    if (templateOptions.length === 1) {
      const isSignatureDoc = SIGNATURE_REQUIRED_TEMPLATES.has(templateOptions[0].value);
      return (
        <Button
          variant={variant}
          size={size}
          onClick={() => handlePrintDocument(templateOptions[0].value)}
          disabled={isGenerating}
          data-testid="button-print-document"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSignatureDoc ? (
            <PenLine className="h-4 w-4" />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          {showLabel && <span className="ml-2">{templateOptions[0].label}</span>}
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isGenerating}
            data-testid="button-print-document-menu"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {showLabel && <span className="ml-2">Печать</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {templateOptions.map((option) => {
            const needsSig = SIGNATURE_REQUIRED_TEMPLATES.has(option.value);
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handlePrintDocument(option.value)}
                data-testid={`menu-item-${option.value}`}
              >
                {needsSig ? (
                  <PenLine className="h-4 w-4 mr-2 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {option.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      {renderButton()}

      <Dialog open={signatureModal.open} onOpenChange={(open) => setSignatureModal(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5" />
              Подпись клиента
            </DialogTitle>
            <DialogDescription>
              Документ «{signatureModal.templateLabel}» требует подписи клиента
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signer-name">ФИО подписанта (необязательно)</Label>
              <Input
                id="signer-name"
                placeholder="Иванов Иван Иванович"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Подпись</Label>
              <SignaturePad onSignatureChange={setSignatureData} width={500} height={180} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSignatureModal(prev => ({ ...prev, open: false }))}
            >
              Отмена
            </Button>
            <Button
              onClick={handleGenerateWithSignature}
              disabled={!signatureData || isGenerating}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
              Сгенерировать и распечатать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
