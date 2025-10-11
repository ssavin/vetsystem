import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";
import { format } from "date-fns";

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

export default function QueueDisplay() {
  const { data: activeCalls = [] } = useQuery<QueueCall[]>({
    queryKey: ['/api/queue/calls', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/queue/calls?activeOnly=true', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch calls');
      return response.json();
    },
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4" data-testid="text-display-title">
            Электронная очередь
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-400" data-testid="text-current-time">
            {format(new Date(), 'HH:mm:ss')}
          </p>
        </div>

        {/* Active Calls Display */}
        {activeCalls.length === 0 ? (
          <Card className="p-16 text-center" data-testid="card-no-calls">
            <Phone className="w-32 h-32 mx-auto mb-8 text-gray-400" />
            <p className="text-4xl text-gray-500 dark:text-gray-400">
              Нет активных вызовов
            </p>
          </Card>
        ) : (
          <div className="grid gap-8" data-testid="list-active-calls">
            {activeCalls.map((call) => (
              <Card 
                key={call.id} 
                className="p-12 hover-elevate transition-all duration-300 border-4"
                data-testid={`card-call-${call.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <Badge 
                      className="text-6xl px-8 py-4 bg-blue-600 dark:bg-blue-700"
                      data-testid={`badge-queue-number-${call.id}`}
                    >
                      № {call.queueNumber}
                    </Badge>
                    <div>
                      <h2 
                        className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-2"
                        data-testid={`text-patient-name-${call.id}`}
                      >
                        {call.patientName}
                      </h2>
                      <p 
                        className="text-3xl text-gray-600 dark:text-gray-400"
                        data-testid={`text-owner-name-${call.id}`}
                      >
                        Владелец: {call.ownerName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge 
                      className="text-6xl px-8 py-4 bg-green-600 dark:bg-green-700 mb-4"
                      data-testid={`badge-cabinet-${call.id}`}
                    >
                      Кабинет {call.cabinetNumber}
                    </Badge>
                    <p 
                      className="text-2xl text-gray-500 dark:text-gray-400"
                      data-testid={`text-called-time-${call.id}`}
                    >
                      {format(new Date(call.calledAt), 'HH:mm')}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <p className="text-xl text-gray-500 dark:text-gray-400" data-testid="text-refresh-info">
            Обновление каждые 3 секунды
          </p>
        </div>
      </div>
    </div>
  );
}
