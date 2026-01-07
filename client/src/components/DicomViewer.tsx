import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  ZoomIn, ZoomOut, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Maximize2, Minimize2, Download, FileImage, X, ChevronLeft, ChevronRight,
  Sun, Contrast, Ruler, Move, MousePointer, Plus
} from 'lucide-react';
import type { DicomStudy, DicomSeries, DicomInstance } from '@shared/schema';
import { DicomUploader } from './DicomUploader';

interface DicomViewerProps {
  study: DicomStudy;
  onClose: () => void;
}

const MODALITY_LABELS: Record<string, string> = {
  'CR': 'Рентген (CR)',
  'DX': 'Рентген (DX)',
  'US': 'УЗИ',
  'CT': 'КТ',
  'MR': 'МРТ',
  'XA': 'Ангиография',
  'RF': 'Рентгеноскопия',
  'OT': 'Другое'
};

export function DicomViewer({ study, onClose }: DicomViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [currentInstanceIndex, setCurrentInstanceIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [tool, setTool] = useState<'pan' | 'zoom' | 'measure' | 'window'>('pan');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: seriesList = [] } = useQuery<DicomSeries[]>({
    queryKey: ['/api/dicom/studies', study.id, 'series'],
  });

  const { data: instances = [] } = useQuery<DicomInstance[]>({
    queryKey: ['/api/dicom/series', selectedSeriesId, 'instances'],
    enabled: !!selectedSeriesId,
  });

  const currentInstance = instances[currentInstanceIndex];

  useEffect(() => {
    if (seriesList.length > 0 && !selectedSeriesId) {
      setSelectedSeriesId(seriesList[0].id);
    }
  }, [seriesList, selectedSeriesId]);

  useEffect(() => {
    if (instances.length > 0) {
      setCurrentInstanceIndex(0);
      setSelectedInstanceId(instances[0].id);
    }
  }, [instances]);

  const handleSeriesSelect = (seriesId: string) => {
    setSelectedSeriesId(seriesId);
    setCurrentInstanceIndex(0);
    resetTransforms();
  };

  const resetTransforms = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
  };

  const handlePrevInstance = () => {
    if (currentInstanceIndex > 0) {
      setCurrentInstanceIndex(prev => prev - 1);
    }
  };

  const handleNextInstance = () => {
    if (currentInstanceIndex < instances.length - 1) {
      setCurrentInstanceIndex(prev => prev + 1);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotateCw = () => setRotation(prev => (prev + 90) % 360);
  const handleRotateCcw = () => setRotation(prev => (prev - 90 + 360) % 360);
  const handleFlipH = () => setFlipH(prev => !prev);
  const handleFlipV = () => setFlipV(prev => !prev);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await viewportRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const imageTransform = `
    scale(${zoom}) 
    rotate(${rotation}deg) 
    scaleX(${flipH ? -1 : 1}) 
    scaleY(${flipV ? -1 : 1})
  `;

  const imageFilter = `brightness(${brightness}%) contrast(${contrast}%)`;

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[1400px] h-[900px] p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <DialogTitle className="flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  {study.studyDescription || 'DICOM исследование'}
                </DialogTitle>
                <Badge variant="secondary">
                  {MODALITY_LABELS[study.modality] || study.modality}
                </Badge>
                {study.bodyPart && (
                  <Badge variant="outline">{study.bodyPart}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {study.studyDate && (
                  <span>{new Date(study.studyDate).toLocaleDateString('ru-RU')}</span>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-48 border-r bg-muted/30 overflow-hidden flex flex-col">
              <div className="p-2 border-b font-medium text-sm">Серии</div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {seriesList.map((series, idx) => (
                    <Card 
                      key={series.id}
                      data-testid={`series-card-${idx}`}
                      className={`cursor-pointer transition-colors ${
                        selectedSeriesId === series.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover-elevate'
                      }`}
                      onClick={() => handleSeriesSelect(series.id)}
                    >
                      <CardContent className="p-2">
                        <div className="text-xs font-medium truncate">
                          {series.seriesDescription || `Серия ${series.seriesNumber || idx + 1}`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {series.modality} • {series.numberOfInstances || 0} снимков
                        </div>
                        {series.thumbnailPath && (
                          <img 
                            src={series.thumbnailPath} 
                            alt="Превью серии"
                            className="w-full h-20 object-cover mt-2 rounded"
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {seriesList.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Нет серий
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="p-2 border-b flex items-center justify-between gap-2 bg-muted/30">
                <div className="flex items-center gap-1">
                  <Button 
                    size="icon" 
                    variant={tool === 'pan' ? 'default' : 'ghost'}
                    onClick={() => setTool('pan')}
                    data-testid="tool-pan"
                    title="Перемещение"
                  >
                    <Move className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant={tool === 'zoom' ? 'default' : 'ghost'}
                    onClick={() => setTool('zoom')}
                    data-testid="tool-zoom"
                    title="Масштаб"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant={tool === 'window' ? 'default' : 'ghost'}
                    onClick={() => setTool('window')}
                    data-testid="tool-window"
                    title="Яркость/Контраст"
                  >
                    <Sun className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant={tool === 'measure' ? 'default' : 'ghost'}
                    onClick={() => setTool('measure')}
                    data-testid="tool-measure"
                    title="Измерение"
                  >
                    <Ruler className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={handleZoomOut} data-testid="btn-zoom-out" title="Уменьшить">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <Button size="icon" variant="ghost" onClick={handleZoomIn} data-testid="btn-zoom-in" title="Увеличить">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  
                  <div className="w-px h-6 bg-border mx-2" />
                  
                  <Button size="icon" variant="ghost" onClick={handleRotateCcw} data-testid="btn-rotate-ccw" title="Повернуть влево">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleRotateCw} data-testid="btn-rotate-cw" title="Повернуть вправо">
                    <RotateCw className="w-4 h-4" />
                  </Button>
                  
                  <div className="w-px h-6 bg-border mx-2" />
                  
                  <Button size="icon" variant="ghost" onClick={handleFlipH} data-testid="btn-flip-h" title="Отразить по горизонтали">
                    <FlipHorizontal className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleFlipV} data-testid="btn-flip-v" title="Отразить по вертикали">
                    <FlipVertical className="w-4 h-4" />
                  </Button>
                  
                  <div className="w-px h-6 bg-border mx-2" />
                  
                  <Button size="icon" variant="ghost" onClick={resetTransforms} data-testid="btn-reset" title="Сбросить">
                    <MousePointer className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={toggleFullscreen} data-testid="btn-fullscreen" title="Полный экран">
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div 
                ref={viewportRef}
                className="flex-1 bg-black relative overflow-hidden flex items-center justify-center"
                data-testid="dicom-viewport"
              >
                {currentInstance ? (
                  <>
                    {currentInstance.thumbnailPath ? (
                      <img
                        src={currentInstance.thumbnailPath}
                        alt={`Снимок ${currentInstanceIndex + 1}`}
                        className="max-w-full max-h-full object-contain transition-transform"
                        style={{ 
                          transform: imageTransform,
                          filter: imageFilter
                        }}
                        draggable={false}
                      />
                    ) : (
                      <div className="text-white/50 text-center">
                        <FileImage className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>DICOM файл: {currentInstance.sopInstanceUid}</p>
                        <p className="text-sm mt-2">
                          {currentInstance.columns}x{currentInstance.rows} px
                        </p>
                      </div>
                    )}
                    
                    {instances.length > 1 && (
                      <>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute left-4 top-1/2 -translate-y-1/2 opacity-75 hover:opacity-100"
                          onClick={handlePrevInstance}
                          disabled={currentInstanceIndex === 0}
                          data-testid="btn-prev-instance"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-75 hover:opacity-100"
                          onClick={handleNextInstance}
                          disabled={currentInstanceIndex === instances.length - 1}
                          data-testid="btn-next-instance"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </Button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded text-sm">
                          {currentInstanceIndex + 1} / {instances.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-white/50 text-center">
                    <FileImage className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Выберите серию для просмотра снимков</p>
                  </div>
                )}
              </div>

              {tool === 'window' && (
                <div className="p-3 border-t bg-muted/30 flex items-center gap-6">
                  <div className="flex items-center gap-2 flex-1">
                    <Sun className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm w-20">Яркость</span>
                    <Slider
                      value={[brightness]}
                      onValueChange={([v]) => setBrightness(v)}
                      min={0}
                      max={200}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm w-12 text-right">{brightness}%</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Contrast className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm w-20">Контраст</span>
                    <Slider
                      value={[contrast]}
                      onValueChange={([v]) => setContrast(v)}
                      min={0}
                      max={200}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm w-12 text-right">{contrast}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="w-64 border-l bg-muted/30 overflow-hidden flex flex-col">
              <Tabs defaultValue="info" className="flex flex-col h-full">
                <TabsList className="w-full rounded-none border-b">
                  <TabsTrigger value="info" className="flex-1">Информация</TabsTrigger>
                  <TabsTrigger value="annotations" className="flex-1">Заметки</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="flex-1 m-0 overflow-auto">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Исследование</h4>
                        <dl className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Дата:</dt>
                            <dd>{study.studyDate ? new Date(study.studyDate).toLocaleDateString('ru-RU') : '-'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Модальность:</dt>
                            <dd>{MODALITY_LABELS[study.modality] || study.modality}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Область:</dt>
                            <dd>{study.bodyPart || '-'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Статус:</dt>
                            <dd>
                              <Badge variant={study.status === 'completed' ? 'default' : 'secondary'}>
                                {study.status === 'completed' ? 'Завершено' : study.status}
                              </Badge>
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {currentInstance && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Текущий снимок</h4>
                          <dl className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Размер:</dt>
                              <dd>{currentInstance.columns}x{currentInstance.rows}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Биты:</dt>
                              <dd>{currentInstance.bitsAllocated || '-'}</dd>
                            </div>
                            {currentInstance.windowCenter && (
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">Window C:</dt>
                                <dd>{currentInstance.windowCenter}</dd>
                              </div>
                            )}
                            {currentInstance.windowWidth && (
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">Window W:</dt>
                                <dd>{currentInstance.windowWidth}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      )}

                      {study.interpretation && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Заключение</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {study.interpretation}
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="annotations" className="flex-1 m-0 overflow-auto">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Аннотации и измерения будут отображаться здесь
                      </p>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PatientImagingListProps {
  patientId: string;
}

export function PatientImagingList({ patientId }: PatientImagingListProps) {
  const [selectedStudy, setSelectedStudy] = useState<DicomStudy | null>(null);

  const { data: studies = [], isLoading } = useQuery<DicomStudy[]>({
    queryKey: ['/api/patients', patientId, 'imaging'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (studies.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <FileImage className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Нет снимков</p>
        <p className="text-sm mt-1">Рентген и УЗИ исследования будут отображаться здесь</p>
        <div className="mt-4">
          <DicomUploader patientId={patientId} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <DicomUploader patientId={patientId} />
      </div>
      <div className="space-y-3">
        {studies.map((study) => (
          <Card 
            key={study.id} 
            className="cursor-pointer hover-elevate"
            onClick={() => setSelectedStudy(study)}
            data-testid={`imaging-study-${study.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  {study.thumbnailPath ? (
                    <img 
                      src={study.thumbnailPath} 
                      alt="Превью" 
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <FileImage className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">
                      {study.studyDescription || 'Исследование'}
                    </h4>
                    <Badge variant="secondary">
                      {MODALITY_LABELS[study.modality] || study.modality}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {study.studyDate && new Date(study.studyDate).toLocaleDateString('ru-RU')}
                    {study.bodyPart && ` • ${study.bodyPart}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {study.numberOfSeries} серий, {study.numberOfInstances} снимков
                  </div>
                </div>
                <Badge variant={study.status === 'completed' ? 'default' : 'outline'}>
                  {study.status === 'completed' ? 'Готово' : 'В работе'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedStudy && (
        <DicomViewer 
          study={selectedStudy} 
          onClose={() => setSelectedStudy(null)} 
        />
      )}
    </>
  );
}

export default DicomViewer;
