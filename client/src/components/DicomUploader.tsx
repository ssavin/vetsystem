import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Upload, FileImage, X, CheckCircle2, AlertCircle, Plus, Loader2
} from 'lucide-react';

interface DicomUploaderProps {
  patientId: string;
  encounterId?: string;
  onUploadComplete?: () => void;
}

interface UploadFile {
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const MODALITY_OPTIONS = [
  { value: 'CR', label: 'Рентген (CR)' },
  { value: 'DX', label: 'Рентген (DX)' },
  { value: 'US', label: 'УЗИ' },
  { value: 'CT', label: 'КТ' },
  { value: 'MR', label: 'МРТ' },
  { value: 'OT', label: 'Другое' },
];

export function DicomUploader({ patientId, encounterId, onUploadComplete }: DicomUploaderProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [modality, setModality] = useState<string>('');
  const [bodyPart, setBodyPart] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      file,
      name: file.name,
      size: file.size,
      status: 'pending' as const,
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer.files;
    if (!droppedFiles) return;

    const newFiles: UploadFile[] = Array.from(droppedFiles)
      .filter(file => file.name.endsWith('.dcm') || file.type === 'application/dicom')
      .map(file => ({
        file,
        name: file.name,
        size: file.size,
        status: 'pending' as const,
        progress: 0
      }));

    if (newFiles.length < droppedFiles.length) {
      toast({
        title: "Предупреждение",
        description: "Некоторые файлы были пропущены (принимаются только .dcm файлы)",
        variant: "default"
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, [toast]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0 || !modality) {
        throw new Error('Выберите файлы и модальность');
      }

      setIsUploading(true);
      const studyInstanceUid = `2.25.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;

      const studyData = {
        patientId,
        encounterId,
        studyInstanceUid,
        modality,
        bodyPart: bodyPart || null,
        studyDescription: description || null,
        studyDate: new Date().toISOString(),
        status: 'completed',
        numberOfSeries: 1,
        numberOfInstances: files.length
      };

      const study = await apiRequest('POST', '/api/dicom/studies', studyData);

      const seriesInstanceUid = `${studyInstanceUid}.1`;
      const seriesData = {
        studyId: study.id,
        seriesInstanceUid,
        seriesNumber: 1,
        seriesDescription: description || 'Серия 1',
        modality,
        bodyPart: bodyPart || null,
        numberOfInstances: files.length
      };

      const series = await apiRequest('POST', '/api/dicom/series', seriesData);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploading', progress: 50 } : f
        ));

        try {
          const sopInstanceUid = `${seriesInstanceUid}.${i + 1}`;
          const instanceData = {
            seriesId: series.id,
            sopInstanceUid,
            instanceNumber: i + 1,
            filePath: `/uploads/dicom/${study.id}/${file.name}`,
            fileSize: file.size,
            rows: 512,
            columns: 512,
            bitsAllocated: 16
          };

          await apiRequest('POST', '/api/dicom/instances', instanceData);

          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'success', progress: 100 } : f
          ));
        } catch (error: any) {
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'error', error: error.message } : f
          ));
        }
      }

      return study;
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "DICOM изображения загружены",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'imaging'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dicom/studies'] });
      setOpen(false);
      resetForm();
      onUploadComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить изображения",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const resetForm = () => {
    setFiles([]);
    setModality('');
    setBodyPart('');
    setDescription('');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canSubmit = files.length > 0 && modality && !isUploading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="btn-upload-dicom">
          <Plus className="w-4 h-4 mr-2" />
          Добавить снимок
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="w-5 h-5" />
            Загрузка DICOM изображений
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Модальность *</Label>
              <Select value={modality} onValueChange={setModality}>
                <SelectTrigger data-testid="select-modality">
                  <SelectValue placeholder="Выберите тип исследования" />
                </SelectTrigger>
                <SelectContent>
                  {MODALITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Область исследования</Label>
              <Input
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value)}
                placeholder="Напр.: грудная клетка, брюшная полость"
                data-testid="input-body-part"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Дополнительная информация об исследовании"
              rows={2}
              data-testid="input-description"
            />
          </div>

          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            data-testid="drop-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".dcm,application/dicom"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">
              Перетащите DICOM файлы сюда или нажмите для выбора
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Поддерживаются файлы .dcm
            </p>
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded"
                >
                  <FileImage className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="w-20 h-1" />
                      )}
                    </div>
                  </div>
                  {file.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                  {file.status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  {file.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => { setOpen(false); resetForm(); }}
              disabled={isUploading}
            >
              Отмена
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!canSubmit}
              data-testid="btn-submit-upload"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Загрузить ({files.length} файлов)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DicomUploader;
