import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { translateSpecies } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  species: string;
}

interface Cage {
  id: string;
  name: string;
  status: string;
}

const admitFormSchema = z.object({
  patientId: z.string().min(1, "Выберите пациента"),
  cageId: z.string().min(1, "Выберите клетку")
});

type AdmitFormValues = z.infer<typeof admitFormSchema>;

export function AdmitPatientDialog() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
    enabled: isOpen
  });

  const { data: cages = [] } = useQuery<Cage[]>({
    queryKey: ['/api/cages'],
    enabled: isOpen
  });

  const availableCages = cages.filter(c => c.status === 'available');

  const form = useForm<AdmitFormValues>({
    resolver: zodResolver(admitFormSchema),
    defaultValues: {
      patientId: "",
      cageId: ""
    }
  });

  const admitMutation = useMutation({
    mutationFn: async (data: AdmitFormValues) => {
      const response = await fetch('/api/hospital-stays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to admit patient');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hospital-stays'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cages'] });
      toast({ title: "Пациент госпитализирован" });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось госпитализировать пациента",
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: AdmitFormValues) => {
    admitMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-admit-patient">
          <Plus className="h-4 w-4 mr-2" />
          Госпитализировать
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Госпитализация пациента</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пациент</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-patient">
                        <SelectValue placeholder="Выберите пациента" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map(patient => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name} ({translateSpecies(patient.species)})
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
              name="cageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Клетка</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-cage">
                        <SelectValue placeholder="Выберите клетку" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCages.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Нет свободных клеток
                        </div>
                      ) : (
                        availableCages.map(cage => (
                          <SelectItem key={cage.id} value={cage.id}>
                            {cage.name}
                          </SelectItem>
                        ))
                      )}
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
                onClick={() => setIsOpen(false)}
                data-testid="button-cancel-admit"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={admitMutation.isPending || availableCages.length === 0}
                data-testid="button-confirm-admit"
              >
                {admitMutation.isPending ? "Госпитализация..." : "Госпитализировать"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
