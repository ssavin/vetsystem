import { useEffect, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Phone, User, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLocation } from 'wouter'

export function IncomingCallNotification() {
  const { incomingCall, clearIncomingCall } = useWebSocket()
  const [, navigate] = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (incomingCall) {
      setIsOpen(true)
      
      // Play notification sound if available
      try {
        const audio = new Audio('/notification.mp3')
        audio.play().catch(() => {
          // Ignore if audio can't play (browser restrictions)
        })
      } catch (e) {
        // Ignore audio errors
      }
    }
  }, [incomingCall])

  const handleClose = () => {
    setIsOpen(false)
    clearIncomingCall()
  }

  const handleOpenOwner = () => {
    if (incomingCall?.owner?.id) {
      // Navigate to registry page with owner selected
      navigate(`/registry?tab=clients&ownerId=${incomingCall.owner.id}`)
      handleClose()
    }
  }

  if (!incomingCall) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-incoming-call">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600 animate-pulse" />
              Входящий звонок
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              data-testid="button-close-call-notification"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Звонок с номера {incomingCall.phone}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {incomingCall.owner ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg" data-testid="text-owner-name">
                        {incomingCall.owner.name}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid="text-owner-phone">
                        {incomingCall.owner.phone}
                      </p>
                      {incomingCall.owner.email && (
                        <p className="text-sm text-muted-foreground" data-testid="text-owner-email">
                          {incomingCall.owner.email}
                        </p>
                      )}
                    </div>
                    <Badge variant="default" className="bg-green-600">
                      Клиент найден
                    </Badge>
                  </div>

                  {incomingCall.patients && incomingCall.patients.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium mb-2">Питомцы:</p>
                      <div className="space-y-1">
                        {incomingCall.patients.map((patient) => (
                          <div 
                            key={patient.id} 
                            className="text-sm text-muted-foreground flex items-center gap-2"
                            data-testid={`text-patient-${patient.id}`}
                          >
                            <span className="font-medium">{patient.name}</span>
                            <span>•</span>
                            <span>{patient.species}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleOpenOwner}
                    className="w-full"
                    data-testid="button-open-owner"
                  >
                    Открыть карточку клиента
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-4">
                  <Badge variant="secondary">Клиент не найден</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Номер телефона {incomingCall.phone} не зарегистрирован в системе
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="mt-4"
                    data-testid="button-close"
                  >
                    Закрыть
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
