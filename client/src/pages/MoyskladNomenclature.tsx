import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Wrench, Loader2, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function MoyskladNomenclature() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Мутация для синхронизации номенклатуры
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/moysklad/nomenclature/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Ошибка синхронизации');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Синхронизация завершена",
        description: `Загружено ${data.data?.loaded?.total || 0} позиций из МойСклад`,
      });
      queryClient.setQueryData(['moysklad-nomenclature'], data);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить номенклатуру из МойСклад",
        variant: "destructive"
      });
    }
  });

  // Запрос данных из кэша или повторная синхронизация
  const { data: nomenclatureData, isLoading } = useQuery({
    queryKey: ['moysklad-nomenclature'],
    queryFn: async () => {
      // Пытаемся получить данные из кэша или синхронизировать заново
      return syncMutation.mutateAsync();
    },
    enabled: false // Загружаем только по требованию
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const products = nomenclatureData?.data?.products || [];
  const services = nomenclatureData?.data?.services || [];
  const total = nomenclatureData?.data?.loaded?.total || 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Номенклатура из МойСклад</h1>
          <p className="text-muted-foreground">
            Товары и услуги, загруженные из системы МойСклад
          </p>
        </div>
        <Button 
          onClick={handleSync}
          disabled={syncMutation.isPending}
          data-testid="button-sync-moysklad"
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Загрузить из МойСклад
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Товары</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Услуги</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Список товаров */}
      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Товары из МойСклад</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {products.map((product: any, index: number) => (
                <div 
                  key={product.moyskladId || index} 
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{product.name}</h4>
                    {product.description && (
                      <p className="text-sm text-muted-foreground">{product.description}</p>
                    )}
                    {product.article && (
                      <p className="text-xs text-muted-foreground">Артикул: {product.article}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{product.price || 0} ₽</Badge>
                    <Badge variant="outline">НДС {product.vat || 0}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список услуг */}
      {services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Услуги из МойСклад</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service: any, index: number) => (
                <div 
                  key={service.moyskladId || index} 
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{service.name}</h4>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                    {service.article && (
                      <p className="text-xs text-muted-foreground">Артикул: {service.article}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{service.price || 0} ₽</Badge>
                    <Badge variant="outline">НДС {service.vat || 0}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка данных...</span>
        </div>
      )}

      {!isLoading && total === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Нет загруженной номенклатуры из МойСклад.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Нажмите "Загрузить из МойСклад" для получения данных.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}