import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PrintDocumentButtonProps {
  entityId: string;
  entityType: 'medical_record' | 'invoice' | 'encounter';
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

interface GenerateDocumentRequest {
  templateType: string;
  entityId: string;
  outputFormat: 'pdf' | 'html';
}

export function PrintDocumentButton({
  entityId,
  entityType,
  variant = 'outline',
  size = 'sm',
  showLabel = false
}: PrintDocumentButtonProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Mutation for generating documents
  const generateDocumentMutation = useMutation({
    mutationFn: async (data: GenerateDocumentRequest) => {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `document-${entityId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Документ сгенерирован',
        description: 'PDF файл успешно загружен'
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка генерации',
        description: error.message
      });
    }
  });

  const handlePrintDocument = async (templateType: string) => {
    try {
      setIsGenerating(true);
      await generateDocumentMutation.mutateAsync({
        templateType,
        entityId,
        outputFormat: 'pdf'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Map entity types to available templates
  const getTemplateOptions = () => {
    switch (entityType) {
      case 'medical_record':
        return [
          { label: 'Медицинская карта', value: 'encounter_summary' },
          { label: 'Рецепт', value: 'prescription' },
          { label: 'Сертификат вакцинации', value: 'vaccination_certificate' }
        ];
      case 'invoice':
        return [
          { label: 'Счет-фактура', value: 'invoice' }
        ];
      case 'encounter':
        return [
          { label: 'Протокол приема', value: 'encounter_summary' },
          { label: 'Результаты анализов', value: 'lab_results_report' }
        ];
      default:
        return [];
    }
  };

  const templateOptions = getTemplateOptions();

  // If only one template option, render simple button
  if (templateOptions.length === 1) {
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
        ) : (
          <Printer className="h-4 w-4" />
        )}
        {showLabel && <span className="ml-2">{templateOptions[0].label}</span>}
      </Button>
    );
  }

  // If multiple template options, render dropdown menu
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
        {templateOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handlePrintDocument(option.value)}
            data-testid={`menu-item-${option.value}`}
          >
            <FileText className="h-4 w-4 mr-2" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
