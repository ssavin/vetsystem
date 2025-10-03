import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useLocation, useParams } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText,
  Calendar,
  User,
  Stethoscope,
  FlaskConical,
  Paperclip
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format, isValid } from "date-fns"
import { ru } from "date-fns/locale"
import { queryClient, apiRequest } from "@/lib/queryClient"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import EncounterDialog from "@/components/EncounterDialog"

interface ClinicalEncounter {
  id: string
  clinicalCaseId: string
  doctorId: string
  encounterDate: string
  anamnesis?: string | null
  diagnosis?: string | null
  treatmentPlan?: string | null
  notes?: string | null
  status: 'in_progress' | 'completed'
}

interface LabAnalysis {
  id: string
  encounterId: string
  analysisName: string
  orderDate: string
  results?: string | null
  completionDate?: string | null
  status: 'ordered' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string | null
}

export default function ClinicalCaseDetail() {
  const { id } = useParams()
  const [, navigate] = useLocation()
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const { toast } = useToast()

  // Fetch clinical case details
  const { data: clinicalCase, isLoading: isLoadingCase } = useQuery({
    queryKey: ['/api/clinical-cases', id],
    enabled: !!id,
  })

  // Fetch patient info
  const { data: patient } = useQuery({
    queryKey: clinicalCase ? [`/api/patients/${clinicalCase.patientId}`] : [],
    enabled: !!clinicalCase?.patientId,
  })

  // Fetch owner info
  const { data: owner } = useQuery({
    queryKey: patient ? [`/api/owners/${patient.ownerId}`] : [],
    enabled: !!patient?.ownerId,
  })

  // Fetch doctors for display
  const { data: doctors = [], isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['/api/doctors'],
  })

  // Close case mutation
  const closeCaseMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/clinical-cases/${id}/close`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clinical-cases', id] })
      queryClient.invalidateQueries({ queryKey: ['/api/clinical-cases'] })
      toast({
        title: "Случай закрыт",
        description: "Клинический случай успешно закрыт",
      })
      setShowCloseDialog(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось закрыть случай",
        variant: "destructive",
      })
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Открыт</Badge>
      case 'closed':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Закрыт</Badge>
      case 'resolved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Решен</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getEncounterStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge variant="default" className="bg-orange-500"><Clock className="h-3 w-3 mr-1" />В процессе</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Завершено</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAnalysisStatusBadge = (status: string) => {
    switch (status) {
      case 'ordered':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Заказан</Badge>
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />В работе</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Готов</Badge>
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Отменен</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDoctorName = (doctorId: string) => {
    if (isLoadingDoctors) return 'Загрузка...'
    if (!Array.isArray(doctors) || doctors.length === 0) return 'Врач не указан'
    const doctor = doctors.find((d: any) => d.id === doctorId)
    return doctor ? doctor.name : `Врач не найден (ID: ${doctorId.substring(0, 8)})`
  }

  const handleBack = () => {
    navigate('/clinical-cases')
  }

  const handleCloseCase = () => {
    setShowCloseDialog(true)
  }

  if (isLoadingCase) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!clinicalCase) {
    return (
      <div className="space-y-6 p-6">
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-destructive">Клинический случай не найден</p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к списку
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const encounters = clinicalCase.encounters || []

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-case-title">
              Клинический случай
            </h1>
            <p className="text-muted-foreground">
              {patient?.name || 'Загрузка...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(clinicalCase.status)}
          {clinicalCase.status === 'open' && (
            <Button 
              variant="outline" 
              onClick={handleCloseCase}
              data-testid="button-close-case"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Закрыть случай
            </Button>
          )}
        </div>
      </div>

      {/* Case Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Информация о случае
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Пациент</p>
              <p className="text-lg font-semibold" data-testid="text-patient-name">
                {patient?.name || 'Загрузка...'}
              </p>
              <p className="text-sm text-muted-foreground">
                {patient?.species} {patient?.breed && `• ${patient.breed}`}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Владелец</p>
              <p className="text-lg font-semibold" data-testid="text-owner-name">
                {owner?.name || 'Загрузка...'}
              </p>
              {owner?.phone && (
                <p className="text-sm text-muted-foreground">{owner.phone}</p>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Причина визита</p>
            <p className="text-base" data-testid="text-reason-for-visit">{clinicalCase.reasonForVisit}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Дата открытия</p>
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {clinicalCase.startDate && isValid(new Date(clinicalCase.startDate))
                  ? format(new Date(clinicalCase.startDate), 'dd MMMM yyyy, HH:mm', { locale: ru })
                  : 'Не указано'}
              </p>
            </div>
            {clinicalCase.closeDate && isValid(new Date(clinicalCase.closeDate)) && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Дата закрытия</p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(clinicalCase.closeDate), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Encounters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Обследования ({encounters.length})
            </CardTitle>
            {clinicalCase.status === 'open' && (
              <EncounterDialog 
                caseId={id!} 
                patientName={patient?.name || 'Пациент'} 
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {encounters.length === 0 ? (
            <div className="text-center py-8">
              <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Обследования отсутствуют</p>
              {clinicalCase.status === 'open' && (
                <EncounterDialog 
                  caseId={id!} 
                  patientName={patient?.name || 'Пациент'}
                  trigger={
                    <Button variant="outline" className="mt-4" data-testid="button-create-first-encounter">
                      <Plus className="h-4 w-4 mr-2" />
                      Создать первое обследование
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {encounters.map((encounter: ClinicalEncounter) => (
                <Card key={encounter.id} data-testid={`card-encounter-${encounter.id}`}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{getDoctorName(encounter.doctorId)}</p>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {encounter.encounterDate && isValid(new Date(encounter.encounterDate))
                              ? format(new Date(encounter.encounterDate), 'dd MMMM yyyy, HH:mm', { locale: ru })
                              : 'Не указано'}
                          </p>
                        </div>
                        {getEncounterStatusBadge(encounter.status)}
                      </div>

                      {encounter.anamnesis && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Анамнез</p>
                          <p className="text-sm">{encounter.anamnesis}</p>
                        </div>
                      )}

                      {encounter.diagnosis && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Диагноз</p>
                          <p className="text-sm">{encounter.diagnosis}</p>
                        </div>
                      )}

                      {encounter.treatmentPlan && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">План лечения</p>
                          <p className="text-sm">{encounter.treatmentPlan}</p>
                        </div>
                      )}

                      {encounter.notes && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Примечания</p>
                          <p className="text-sm">{encounter.notes}</p>
                        </div>
                      )}

                      {/* Lab Analyses for this encounter */}
                      {(encounter as any).labAnalyses && (encounter as any).labAnalyses.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <FlaskConical className="h-4 w-4" />
                            Анализы ({(encounter as any).labAnalyses.length})
                          </p>
                          <div className="space-y-2">
                            {(encounter as any).labAnalyses.map((analysis: LabAnalysis) => (
                              <div 
                                key={analysis.id} 
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{analysis.analysisName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Заказан: {analysis.orderDate && isValid(new Date(analysis.orderDate))
                                      ? format(new Date(analysis.orderDate), 'dd.MM.yyyy', { locale: ru })
                                      : 'Не указано'}
                                    {analysis.completionDate && isValid(new Date(analysis.completionDate)) && (
                                      <span className="ml-2">
                                        • Готов: {format(new Date(analysis.completionDate), 'dd.MM.yyyy', { locale: ru })}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                {getAnalysisStatusBadge(analysis.status)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close Case Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Закрыть клинический случай?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите закрыть этот клинический случай? 
              Это действие можно будет отменить позже.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-close">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => closeCaseMutation.mutate()}
              disabled={closeCaseMutation.isPending}
              data-testid="button-confirm-close"
            >
              {closeCaseMutation.isPending ? "Закрытие..." : "Закрыть случай"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
