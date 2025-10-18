import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { Skeleton } from "@/components/ui/skeleton"

interface CallLog {
  id: string
  callId: string
  phone: string
  direction: string
  status: string
  duration: number | null
  recordingUrl: string | null
  callData: any
  ownerId: string | null
  userId: string | null
  createdAt: string
}

interface CallLogsWidgetProps {
  ownerId: string
}

export function CallLogsWidget({ ownerId }: CallLogsWidgetProps) {
  const { data: callLogs, isLoading } = useQuery<CallLog[]>({
    queryKey: ['/api/call-logs', { ownerId }],
    enabled: !!ownerId,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            История звонков
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!callLogs || callLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            История звонков
          </CardTitle>
          <CardDescription>
            История звонков владельца из Mango Office
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Звонков пока нет</p>
        </CardContent>
      </Card>
    )
  }

  const getCallDirectionIcon = (direction: string) => {
    return direction === 'incoming' ? PhoneIncoming : PhoneOutgoing
  }

  const getCallDirectionText = (direction: string) => {
    return direction === 'incoming' ? 'Входящий' : 'Исходящий'
  }

  const getCallStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", text: string }> = {
      'answered': { variant: 'default', text: 'Отвечен' },
      'missed': { variant: 'destructive', text: 'Пропущен' },
      'busy': { variant: 'secondary', text: 'Занято' },
      'no_answer': { variant: 'secondary', text: 'Не отвечен' },
      'failed': { variant: 'destructive', text: 'Ошибка' },
    }
    const config = statusMap[status] || { variant: 'outline' as const, text: status }
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0с'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}м ${secs}с` : `${secs}с`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          История звонков
        </CardTitle>
        <CardDescription>
          Последние звонки из Mango Office ({callLogs.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {callLogs.map((call) => {
            const DirectionIcon = getCallDirectionIcon(call.direction)
            return (
              <div 
                key={call.id} 
                className="flex items-center justify-between p-3 rounded-lg border"
                data-testid={`call-log-${call.id}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <DirectionIcon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{call.phone}</span>
                      {getCallStatusBadge(call.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(call.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true, locale: ru })}
                      </span>
                    </div>
                  </div>
                </div>
                {call.recordingUrl && (
                  <audio 
                    controls 
                    className="h-8 w-48"
                    src={call.recordingUrl}
                    data-testid={`audio-recording-${call.id}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
