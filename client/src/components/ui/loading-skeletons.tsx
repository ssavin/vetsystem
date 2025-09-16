import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Skeleton для карточек статистики (иконка + заголовок + число + подзаголовок)
export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

// Skeleton для записи на прием (время, пациент, врач, кнопки)
export function AppointmentCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>

        <Skeleton className="h-10 w-full rounded-md" />

        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton для карточки пациента (avatar, имя, статус, информация)
export function PatientCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 mb-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  )
}

// Skeleton для быстрых действий (кнопки с иконками)
export function QuickActionSkeleton() {
  return (
    <div className="h-16 flex flex-col items-center justify-center gap-2 border border-input rounded-md">
      <Skeleton className="h-5 w-5 rounded" />
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

// Skeleton для уведомлений (строка с названием и бейджем)
export function NotificationRowSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-5 w-6 rounded" />
    </div>
  )
}