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
import { Phone, Mail, MapPin, User, Pencil, PawPrint, Calendar, Gift, TrendingUp, TrendingDown } from "lucide-react"
import { CallLogsWidget } from "./CallLogsWidget"
import { useLocation } from "wouter"
import { Skeleton } from "@/components/ui/skeleton"
import { translateSpecies } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface OwnerCardDialogProps {
  ownerId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Translate patient status
const translateStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'healthy': 'Здоров',
    'treatment': 'На лечении',
    'critical': 'Критическое'
  }
  return statusMap[status] || status
}

export function OwnerCardDialog({ ownerId, open, onOpenChange }: OwnerCardDialogProps) {
  const [, navigate] = useLocation()

  // Fetch owner details
  const { data: owner, isLoading: ownerLoading } = useQuery<{ id: string; name: string; phone?: string; email?: string; address?: string; avatar?: string; createdAt?: string; bonusPoints?: number; loyaltyCardNumber?: string }>({
    queryKey: [`/api/owners/${ownerId}`],
    enabled: !!ownerId && open,
  })

  // Fetch owner's patients
  const { data: patients = [], isLoading: patientsLoading } = useQuery<Array<{ id: string; name: string; species: string; breed: string; branchId?: string }>>({
    queryKey: [`/api/owners/${ownerId}/patients`],
    enabled: !!ownerId && open,
  })

  // Fetch loyalty data
  const { data: loyaltyTransactions = [] } = useQuery<Array<{ id: string; type: string; points: number; balanceBefore: number; balanceAfter: number; description: string; createdAt: string }>>({
    queryKey: [`/api/loyalty/transactions/${ownerId}`],
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
                        Клиент с {owner.createdAt ? new Date(owner.createdAt).toLocaleDateString('ru-RU') : '—'}
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
                              {translateSpecies(patient.species)} • {patient.breed}
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
                            {translateStatus(patient.status || 'healthy')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Loyalty Card */}
            {owner.bonusPoints !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      Программа лояльности
                    </div>
                    <Badge variant="outline" className="text-base font-bold px-3 py-1">
                      {(owner.bonusPoints || 0).toLocaleString('ru-RU')} баллов
                    </Badge>
                  </CardTitle>
                </CardHeader>
                {loyaltyTransactions.length > 0 && (
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Дата</TableHead>
                          <TableHead>Операция</TableHead>
                          <TableHead className="text-right">Баллы</TableHead>
                          <TableHead className="text-right">Остаток</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loyaltyTransactions.slice(0, 10).map((tx: any) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1">
                                {tx.type === 'earn'
                                  ? <TrendingUp className="h-3 w-3 text-green-500" />
                                  : <TrendingDown className="h-3 w-3 text-blue-500" />}
                                {tx.description}
                              </div>
                            </TableCell>
                            <TableCell className={`text-right font-medium text-sm ${tx.type === 'earn' ? 'text-green-600' : 'text-blue-600'}`}>
                              {tx.type === 'earn' ? '+' : '-'}{tx.points}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {tx.balanceAfter}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            )}

            <Separator />

            {/* Call History */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Phone className="h-5 w-5" />
                История звонков
              </h3>
              <CallLogsWidget ownerId={ownerId} />
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
