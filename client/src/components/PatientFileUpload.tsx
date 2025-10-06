import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Image,
  FileCheck,
  Download,
  Trash2,
  Eye,
  X,
  FileImage,
  FileSpreadsheet,
  Activity,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface PatientFile {
  id: string;
  patientId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  description: string | null;
  medicalRecordId: string | null;
  createdAt: string;
  uploadedBy: string;
}

interface PatientFileUploadProps {
  patientId: string;
  medicalRecordId?: string;
  onFileUploaded?: () => void;
}

const FILE_TYPE_LABELS = {
  medical_image: "Медицинское изображение",
  xray: "Рентген",
  scan: "Скан/УЗИ",
  lab_result: "Результат анализа",
  vaccine_record: "Запись о вакцинации",
  document: "Документ",
  receipt: "Чек/Квитанция",
  other: "Другое",
};

const FILE_TYPE_ICONS = {
  medical_image: FileImage,
  xray: Activity,
  scan: Activity,
  lab_result: FileCheck,
  vaccine_record: FileText,
  document: FileText,
  receipt: FileText,
  other: FileText,
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  if (mimeType.includes('document') || mimeType.includes('word')) return FileText;
  return FileText;
}

export function PatientFileUpload({ patientId, medicalRecordId, onFileUploaded }: PatientFileUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [previewFile, setPreviewFile] = useState<PatientFile | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: filesData, isLoading } = useQuery<PatientFile[]>({
    queryKey: ['/api/patients', patientId, 'files'],
  });

  // Ensure files is always an array
  const files = Array.isArray(filesData) ? filesData : [];

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !fileType) {
        throw new Error("Выберите файл и тип");
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileType', fileType);
      if (description) formData.append('description', description);
      if (medicalRecordId) formData.append('medicalRecordId', medicalRecordId);

      const response = await fetch(`/api/patients/${patientId}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка загрузки файла');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'files'] });
      toast({
        title: "Файл загружен",
        description: "Файл успешно прикреплён к карте пациента",
      });
      setIsOpen(false);
      setSelectedFile(null);
      setFileType("");
      setDescription("");
      onFileUploaded?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest('DELETE', `/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'files'] });
      toast({
        title: "Файл удалён",
        description: "Файл успешно удалён",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (file: PatientFile) => {
    try {
      const response = await fetch(`/api/files/${file.id}/download`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Ошибка скачивания файла');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скачать файл",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Прикреплённые файлы</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-upload-file">
              <Upload className="h-4 w-4 mr-2" />
              Загрузить файл
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Загрузка файла</DialogTitle>
              <DialogDescription>
                Загрузите результаты анализов, рентген, УЗИ или другие медицинские документы
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file">Файл</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  data-testid="input-file"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileType">Тип файла</Label>
                <Select value={fileType} onValueChange={setFileType}>
                  <SelectTrigger data-testid="select-file-type">
                    <SelectValue placeholder="Выберите тип файла" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xray">Рентген</SelectItem>
                    <SelectItem value="scan">Скан/УЗИ</SelectItem>
                    <SelectItem value="lab_result">Результат анализа</SelectItem>
                    <SelectItem value="vaccine_record">Запись о вакцинации</SelectItem>
                    <SelectItem value="medical_image">Медицинское изображение</SelectItem>
                    <SelectItem value="document">Документ</SelectItem>
                    <SelectItem value="receipt">Чек/Квитанция</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание (необязательно)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Краткое описание файла..."
                  data-testid="textarea-description"
                />
              </div>

              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={!selectedFile || !fileType || uploadMutation.isPending}
                className="w-full"
                data-testid="button-submit-upload"
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Загрузка файлов...</div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Нет прикреплённых файлов</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {files.map((file) => {
            const FileIcon = FILE_TYPE_ICONS[file.fileType as keyof typeof FILE_TYPE_ICONS] || FileText;
            const MimeIcon = getFileIcon(file.mimeType);
            
            return (
              <Card key={file.id} className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
                      <FileIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate" title={file.originalName}>
                            {file.originalName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {FILE_TYPE_LABELS[file.fileType as keyof typeof FILE_TYPE_LABELS] || file.fileType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.fileSize)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {file.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {file.description}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(file.createdAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          data-testid={`button-download-${file.id}`}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Скачать
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewFile(file)}
                          data-testid={`button-preview-${file.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Просмотр
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Вы уверены, что хотите удалить этот файл?')) {
                              deleteMutation.mutate(file.id);
                            }
                          }}
                          data-testid={`button-delete-${file.id}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Диалог предпросмотра */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{previewFile?.originalName}</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          {previewFile && (
            <div className="mt-4">
              {previewFile.mimeType.startsWith('image/') ? (
                <img
                  src={`/api/files/${previewFile.id}/download`}
                  alt={previewFile.originalName}
                  className="max-w-full h-auto mx-auto rounded-lg"
                />
              ) : previewFile.mimeType === 'application/pdf' ? (
                <iframe
                  src={`/api/files/${previewFile.id}/download`}
                  className="w-full h-[70vh] rounded-lg border"
                  title={previewFile.originalName}
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    Предпросмотр недоступен для данного типа файла
                  </p>
                  <Button onClick={() => handleDownload(previewFile)}>
                    <Download className="h-4 w-4 mr-2" />
                    Скачать файл
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
