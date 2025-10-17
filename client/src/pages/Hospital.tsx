import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { translateSpecies } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Home, AlertCircle, Settings } from "lucide-react";
import { AdmitPatientDialog } from "@/components/AdmitPatientDialog";
import { HospitalStayDetails } from "@/components/HospitalStayDetails";

interface Cage {
  id: string;
  name: string;
  status: 'available' | 'occupied' | 'maintenance';
  tenantId: string;
  branchId: string;
}

interface HospitalStay {
  id: string;
  patientId: string;
  cageId: string;
  activeInvoiceId: string;
  status: 'active' | 'discharged';
  admittedAt: string;
  dischargedAt?: string;
  patient?: {
    id: string;
    name: string;
    species: string;
    ownerId?: string;
  };
  owner?: {
    id: string;
    fullName: string;
    phone?: string;
  };
  cage?: {
    id: string;
    name: string;
  };
  treatmentCount?: number;
}

const cageFormSchema = z.object({
  name: z.string().min(1, "Название клетки обязательно"),
  status: z.enum(['available', 'occupied', 'maintenance']).default('available')
});

type CageFormValues = z.infer<typeof cageFormSchema>;

function CageCard({ cage, onUpdate }: { cage: Cage; onUpdate: () => void }) {
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const form = useForm<CageFormValues>({
    resolver: zodResolver(cageFormSchema),
    defaultValues: {
      name: cage.name,
      status: cage.status
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CageFormValues) => {
      const response = await fetch(`/api/cages/${cage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update cage');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cages'] });
      toast({ title: "Клетка обновлена" });
      setIsEditOpen(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось обновить клетку",
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: CageFormValues) => {
    updateMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-600">Свободна</Badge>;
      case 'occupied':
        return <Badge variant="destructive">Занята</Badge>;
      case 'maintenance':
        return <Badge variant="secondary">Обслуживание</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <Home className="h-8 w-8 text-green-600" />;
      case 'occupied':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      case 'maintenance':
        return <Settings className="h-8 w-8 text-gray-600" />;
      default:
        return null;
    }
  };

  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{cage.name}</CardTitle>
        {getStatusBadge(cage.status)}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(cage.status)}
          </div>
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid={`button-edit-cage-${cage.id}`}>
                Изменить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Редактировать клетку</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-cage-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Статус</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-cage-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Свободна</SelectItem>
                            <SelectItem value="occupied">Занята</SelectItem>
                            <SelectItem value="maintenance">Обслуживание</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEditOpen(false)}
                      data-testid="button-cancel-cage"
                    >
                      Отмена
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                      data-testid="button-save-cage"
                    >
                      {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function CagesTab() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: cages = [], isLoading } = useQuery<Cage[]>({
    queryKey: ['/api/cages']
  });

  const form = useForm<CageFormValues>({
    resolver: zodResolver(cageFormSchema),
    defaultValues: {
      name: "",
      status: 'available'
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: CageFormValues) => {
      const response = await fetch('/api/cages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create cage');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cages'] });
      toast({ title: "Клетка создана" });
      setIsAddOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось создать клетку",
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: CageFormValues) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Клетки стационара</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-cage">
              <Plus className="h-4 w-4 mr-2" />
              Добавить клетку
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая клетка</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Клетка 1" data-testid="input-new-cage-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Статус</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-new-cage-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">Свободна</SelectItem>
                          <SelectItem value="occupied">Занята</SelectItem>
                          <SelectItem value="maintenance">Обслуживание</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddOpen(false)}
                    data-testid="button-cancel-new-cage"
                  >
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-create-cage"
                  >
                    {createMutation.isPending ? "Создание..." : "Создать"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {cages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Клетки не добавлены</p>
            <p className="text-sm text-muted-foreground">Добавьте клетки для стационара</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cages.map(cage => (
            <CageCard 
              key={cage.id} 
              cage={cage} 
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['/api/cages'] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PatientsTab() {
  const [selectedStay, setSelectedStay] = useState<HospitalStay | null>(null);

  const { data: stays = [], isLoading } = useQuery<HospitalStay[]>({
    queryKey: ['/api/hospital-stays'],
    queryFn: async () => {
      const response = await fetch('/api/hospital-stays?status=active', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch hospital stays');
      return response.json();
    }
  });

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Активные пациенты</h2>
        <AdmitPatientDialog />
      </div>

      {stays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет пациентов в стационаре</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {stays.map(stay => (
              <Card 
                key={stay.id} 
                className="hover-elevate cursor-pointer" 
                onClick={() => setSelectedStay(stay)}
                data-testid={`card-patient-${stay.id}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{stay.patient?.name || 'Неизвестный пациент'}</CardTitle>
                      <p className="text-sm text-muted-foreground">{translateSpecies(stay.patient?.species)}</p>
                    </div>
                    <Badge variant="default">В стационаре</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Владелец:</p>
                        <p className="font-medium">{stay.owner?.fullName || 'Не указан'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Телефон:</p>
                        <p className="font-medium">{stay.owner?.phone || 'Не указан'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Клетка:</p>
                        <p className="font-medium">{stay.cage?.name || 'Неизвестно'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Поступил:</p>
                        <p className="font-medium">
                          {new Date(stay.admittedAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    {stay.treatmentCount !== undefined && stay.treatmentCount > 0 && (
                      <div className="pt-2 border-t">
                        <Badge variant="secondary" className="text-xs">
                          Выполнено процедур: {stay.treatmentCount}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedStay && (
            <HospitalStayDetails 
              stay={selectedStay}
              open={!!selectedStay}
              onOpenChange={(open) => {
                if (!open) setSelectedStay(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function Hospital() {
  const [activeTab, setActiveTab] = useState("cages");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Стационар</h1>
        <p className="text-muted-foreground">Управление клетками и пациентами</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cages" data-testid="tab-cages">Клетки</TabsTrigger>
          <TabsTrigger value="patients" data-testid="tab-patients">Активные пациенты</TabsTrigger>
        </TabsList>

        <TabsContent value="cages" className="mt-6">
          <CagesTab />
        </TabsContent>

        <TabsContent value="patients" className="mt-6">
          <PatientsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
