import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Phone, Mail, MapPin, User, Pencil, PawPrint, Calendar } from "lucide-react"
import { CallLogsWidget } from "./CallLogsWidget"
import { useLocation } from "wouter"
import { Skeleton } from "@/components/ui/skeleton"

interface OwnerCardDialogProps {
  ownerId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OwnerCardDialog({ ownerId, open, onOpenChange }: OwnerCardDialogProps) {
  const [, navigate] = useLocation()

  // Fetch owner details
  const { data: owner, isLoading: ownerLoading } = useQuery({
    queryKey: [`/api/owners/${ownerId}`],
    enabled: !!ownerId && open,
  })

  // Fetch owner's patients
  const { data: patients = [], isLoading: patientsLoading } = useQuery<any[]>({
    queryKey: [`/api/owners/${ownerId}/patients`],
    enabled: !!ownerId && open,
  })

  const isLoading = ownerLoading || patientsLoading

  const handleCall = () => {
    if (owner?.phone) {
      window.location.href = `tel:${owner.phone}`
    }
  }

  const handleEditOwner = () => {
    onOpenChange(false)
    navigate(`/registry?tab=owners&ownerId=${ownerId}`)
  }

  const handleViewPatient = (patientId: string) => {
    onOpenChange(false)
    navigate(`/medical-records?patientId=${patientId}&autoOpen=true`)
  }

  if (!ownerId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-owner-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Карта клиента
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : owner ? (
          <div className="space-y-4">
            {/* Owner Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={owner.avatar} />
                      <AvatarFallback className="text-lg">
                        {owner.name?.charAt(0) || 'К'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl" data-testid="text-owner-name">
                        {owner.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Клиент с {new Date(owner.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCall}
                      disabled={!owner.phone}
                      data-testid="button-call-owner"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Позвонить
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditOwner}
                      data-testid="button-edit-owner"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Редактировать
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {owner.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span data-testid="text-owner-phone">{owner.phone}</span>
                  </div>
                )}
                {owner.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span data-testid="text-owner-email">{owner.email}</span>
                  </div>
                )}
                {owner.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span data-testid="text-owner-address">{owner.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Patients List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  Питомцы ({patients.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    У клиента пока нет питомцев
                  </p>
                ) : (
                  <div className="space-y-2">
                    {patients.map((patient: any) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                        onClick={() => handleViewPatient(patient.id)}
                        data-testid={`card-patient-${patient.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={patient.avatar} />
                            <AvatarFallback>{patient.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{patient.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {patient.species} • {patient.breed}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {patient.lastVisit && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(patient.lastVisit).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                          <Badge variant={patient.status === 'critical' ? 'destructive' : 'outline'}>
                            {patient.status || 'healthy'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Call History */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Phone className="h-5 w-5" />
                История звонков
              </h3>
              <CallLogsWidget ownerId={ownerId} compact={false} />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Клиент не найден
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
