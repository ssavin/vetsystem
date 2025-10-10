import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, PhoneCall, CheckCircle, XCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type QueueEntry = {
  id: string;
  queueNumber: number;
  patientId: string;
  ownerId: string;
  status: 'waiting' | 'called' | 'in_progress' | 'completed' | 'cancelled';
  arrivalTime: string;
  notes?: string;
  patientName: string;
  patientSpecies: string;
  ownerName: string;
  ownerPhone: string;
};

type QueueCall = {
  id: string;
  queueEntryId: string;
  cabinetNumber: string;
  calledBy: string;
  calledAt: string;
  displayedUntil?: string;
  queueNumber: number;
  patientName: string;
  ownerName: string;
  calledByName: string;
};

export default function Queue() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: queueEntries = [], isLoading } = useQuery<QueueEntry[]>({
    queryKey: ['/api/queue/entries', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all' 
        ? '/api/queue/entries'
        : `/api/queue/entries?status=${statusFilter}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch queue');
      return response.json();
    },
  });

  const { data: activeCalls = [] } = useQuery<QueueCall[]>({
    queryKey: ['/api/queue/calls', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/queue/calls?activeOnly=true', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch calls');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest(`/api/queue/entries/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queue/entries'] });
      toast({
        title: "Статус обновлен",
        description: "Статус записи в очереди успешно изменен",
      });
    },
  });

  const callPatientMutation = useMutation({
    mutationFn: async ({ queueEntryId, cabinetNumber }: { queueEntryId: string; cabinetNumber: string }) => {
      return apiRequest('/api/queue/calls', {
        method: 'POST',
        body: JSON.stringify({
          queueEntryId,
          cabinetNumber,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queue/entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/queue/calls'] });
      toast({
        title: "Пациент вызван",
        description: "Пациент вызван в кабинет",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      waiting: { label: "Ожидает", className: "bg-yellow-500" },
      called: { label: "Вызван", className: "bg-blue-500" },
      in_progress: { label: "На приеме", className: "bg-purple-500" },
      completed: { label: "Завершен", className: "bg-green-500" },
      cancelled: { label: "Отменен", className: "bg-gray-500" },
    };
    const config = variants[status as keyof typeof variants] || { label: status, className: "" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleCallPatient = (entry: QueueEntry) => {
    const cabinet = prompt("Введите номер кабинета:");
    if (cabinet) {
      callPatientMutation.mutate({
        queueEntryId: entry.id,
        cabinetNumber: cabinet,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка очереди...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Электронная очередь</h1>
          <p className="text-muted-foreground">
            Управление очередью пациентов
          </p>
        </div>
        <Button data-testid="button-add-queue-entry">
          <Plus className="w-4 h-4 mr-2" />
          Добавить в очередь
        </Button>
      </div>

      {/* Active Calls Display */}
      {activeCalls.length > 0 && (
        <div className="bg-primary/10 border border-primary rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Текущие вызовы</h2>
          <div className="grid gap-2">
            {activeCalls.map(call => (
              <div key={call.id} className="flex items-center justify-between bg-background rounded p-3">
                <div className="flex items-center gap-3">
                  <PhoneCall className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-medium">
                      Очередь #{call.queueNumber} - {call.patientName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Кабинет {call.cabinetNumber} • {call.calledByName}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(call.calledAt).toLocaleTimeString('ru-RU')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Статус:</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="waiting">Ожидает</SelectItem>
            <SelectItem value="called">Вызван</SelectItem>
            <SelectItem value="in_progress">На приеме</SelectItem>
            <SelectItem value="completed">Завершен</SelectItem>
            <SelectItem value="cancelled">Отменен</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Queue Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">№</TableHead>
              <TableHead>Пациент</TableHead>
              <TableHead>Владелец</TableHead>
              <TableHead>Время прибытия</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Примечания</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queueEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Очередь пуста
                </TableCell>
              </TableRow>
            ) : (
              queueEntries.map(entry => (
                <TableRow key={entry.id} data-testid={`queue-entry-${entry.id}`}>
                  <TableCell className="font-bold text-lg">
                    {entry.queueNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{entry.patientName}</div>
                    <div className="text-sm text-muted-foreground">{entry.patientSpecies}</div>
                  </TableCell>
                  <TableCell>
                    <div>{entry.ownerName}</div>
                    <div className="text-sm text-muted-foreground">{entry.ownerPhone}</div>
                  </TableCell>
                  <TableCell>
                    {new Date(entry.arrivalTime).toLocaleString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(entry.status)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {entry.notes}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {entry.status === 'waiting' && (
                        <Button
                          size="sm"
                          onClick={() => handleCallPatient(entry)}
                          data-testid={`button-call-${entry.id}`}
                        >
                          <PhoneCall className="w-4 h-4 mr-1" />
                          Вызвать
                        </Button>
                      )}
                      {entry.status === 'called' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: entry.id, status: 'in_progress' })}
                          data-testid={`button-start-${entry.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Начать
                        </Button>
                      )}
                      {entry.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: entry.id, status: 'completed' })}
                          data-testid={`button-complete-${entry.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Завершить
                        </Button>
                      )}
                      {(entry.status === 'waiting' || entry.status === 'called') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: entry.id, status: 'cancelled' })}
                          data-testid={`button-cancel-${entry.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Отменить
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
