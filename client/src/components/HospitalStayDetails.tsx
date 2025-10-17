import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { translateSpecies } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, FileText, DoorOpen, Trash2 } from "lucide-react";

interface HospitalStay {
  id: string;
  patientId: string;
  cageId: string;
  activeInvoiceId: string;
  status: string;
  admittedAt: string;
  dischargedAt?: string;
  patient?: {
    id: string;
    name: string;
    species: string;
  };
  cage?: {
    id: string;
    name: string;
  };
}

interface TreatmentLog {
  id: string;
  hospitalStayId: string;
  serviceId: string;
  performerName: string;
  notes?: string;
  createdAt: string;
  service?: {
    id: string;
    name: string;
    price: string;
  };
}

interface Service {
  id: string;
  name: string;
  price: string;
}

const treatmentFormSchema = z.object({
  serviceId: z.string().min(1, "Выберите услугу"),
  performerName: z.string().min(1, "Укажите исполнителя"),
  notes: z.string().optional()
});

type TreatmentFormValues = z.infer<typeof treatmentFormSchema>;

interface HospitalStayDetailsProps {
  stay: HospitalStay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HospitalStayDetails({ stay, open, onOpenChange }: HospitalStayDetailsProps) {
  const { toast } = useToast();
  const [showAddTreatment, setShowAddTreatment] = useState(false);

  const { data: treatmentLog = [] } = useQuery<TreatmentLog[]>({
    queryKey: ['/api/hospital-stays', stay.id, 'log'],
    queryFn: async () => {
      const response = await fetch(`/api/hospital-stays/${stay.id}/log`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch treatment log');
      return response.json();
    },
    enabled: open
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    enabled: showAddTreatment
  });

  const form = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentFormSchema),
    defaultValues: {
      serviceId: "",
      performerName: "",
      notes: ""
    }
  });

  const addTreatmentMutation = useMutation({
    mutationFn: async (data: TreatmentFormValues) => {
      const response = await fetch(`/api/hospital-stays/${stay.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add treatment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hospital-stays', stay.id, 'log'] });
      toast({ title: "Процедура добавлена в журнал" });
      setShowAddTreatment(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось добавить процедуру",
        variant: "destructive" 
      });
    }
  });

  const dischargeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/hospital-stays/${stay.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'discharged' })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to discharge patient');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hospital-stays'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cages'] });
      toast({ title: "Пациент выписан из стационара" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось выписать пациента",
        variant: "destructive" 
      });
    }
  });

  const deleteTreatmentMutation = useMutation({
    mutationFn: async (logId: string) => {
      const response = await fetch(`/api/hospital-stays/${stay.id}/log/${logId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete treatment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hospital-stays', stay.id, 'log'] });
      toast({ title: "Процедура удалена" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось удалить процедуру",
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: TreatmentFormValues) => {
    addTreatmentMutation.mutate(data);
  };

  const handleDischarge = () => {
    if (confirm(`Выписать пациента ${stay.patient?.name}? Счёт будет закрыт для оплаты на ресепшене.`)) {
      dischargeMutation.mutate();
    }
  };

  const handleDeleteTreatment = (logId: string, serviceName: string) => {
    if (confirm(`Удалить процедуру "${serviceName}"?`)) {
      deleteTreatmentMutation.mutate(logId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Пребывание в стационаре - {stay.patient?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Информация о пациенте</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Пациент</p>
                  <p className="font-medium">{stay.patient?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Вид</p>
                  <p className="font-medium">{translateSpecies(stay.patient?.species)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Клетка</p>
                  <p className="font-medium">{stay.cage?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Поступил</p>
                  <p className="font-medium">
                    {new Date(stay.admittedAt).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Treatment Log */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Журнал манипуляций</h3>
              {stay.status === 'active' && (
                <Button 
                  onClick={() => setShowAddTreatment(true)}
                  size="sm"
                  data-testid="button-add-treatment"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить процедуру
                </Button>
              )}
            </div>

            {treatmentLog.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Процедуры не записаны</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {treatmentLog.map(log => (
                  <Card key={log.id}>
                    <CardContent className="py-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1">
                          <p className="font-medium">{log.service?.name}</p>
                          <p className="text-sm text-muted-foreground">Исполнитель: {log.performerName}</p>
                          {log.notes && (
                            <p className="text-sm text-muted-foreground">Примечание: {log.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString('ru-RU')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {log.service?.price} ₽
                          </Badge>
                          {stay.status === 'active' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteTreatment(log.id, log.service?.name || 'процедуру')}
                              disabled={deleteTreatmentMutation.isPending}
                              data-testid={`button-delete-treatment-${log.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {stay.status === 'active' && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="destructive" 
                onClick={handleDischarge}
                disabled={dischargeMutation.isPending}
                data-testid="button-discharge-patient"
              >
                <DoorOpen className="h-4 w-4 mr-2" />
                {dischargeMutation.isPending ? "Выписка..." : "Выписать пациента"}
              </Button>
            </div>
          )}
        </div>

        {/* Add Treatment Dialog */}
        <Dialog open={showAddTreatment} onOpenChange={setShowAddTreatment}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить процедуру</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Услуга</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-service">
                            <SelectValue placeholder="Выберите услугу" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map(service => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} - {service.price} ₽
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="performerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Исполнитель</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ФИО врача" data-testid="input-performer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Примечания (необязательно)</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddTreatment(false)}
                    data-testid="button-cancel-treatment"
                  >
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={addTreatmentMutation.isPending}
                    data-testid="button-save-treatment"
                  >
                    {addTreatmentMutation.isPending ? "Сохранение..." : "Добавить"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
