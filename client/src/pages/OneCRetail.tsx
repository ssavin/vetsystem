import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Wrench, Loader2, RefreshCw, Receipt, DollarSign } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function OneCRetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Мутация для синхронизации товаров
  const syncProductsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/onec/products/sync');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Синхронизация товаров завершена",
        description: `Загружено ${data.imported || 0} товаров из 1С Розница`,
      });
      queryClient.invalidateQueries({ queryKey: ['onec-data'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить товары: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Мутация для синхронизации услуг
  const syncServicesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/onec/services/sync');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Синхронизация услуг завершена",
        description: `Загружено ${data.imported || 0} услуг из 1С Розница`,
      });
      queryClient.invalidateQueries({ queryKey: ['onec-data'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить услуги: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Получение статистики интеграции
  const { data: onecStats, isLoading } = useQuery({
    queryKey: ['onec-data'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/onec/stats');
      return await response.json();
    },
  });

  const handleSyncProducts = () => {
    syncProductsMutation.mutate();
  };

  const handleSyncServices = () => {
    syncServicesMutation.mutate();
  };

  const handleSyncAll = () => {
    syncProductsMutation.mutate();
    syncServicesMutation.mutate();
  };

  const products = onecStats?.products || [];
  const services = onecStats?.services || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Интеграция с 1С Розница</h1>
          <p className="text-muted-foreground">
            Синхронизация товаров, услуг и отправка чеков в 1С Розница/Касса
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSyncProducts}
            disabled={syncProductsMutation.isPending}
            variant="outline"
            data-testid="button-sync-onec-products"
          >
            {syncProductsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Package className="h-4 w-4 mr-2" />
            )}
            Синхронизировать товары
          </Button>
          <Button 
            onClick={handleSyncServices}
            disabled={syncServicesMutation.isPending}
            variant="outline"
            data-testid="button-sync-onec-services"
          >
            {syncServicesMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Wrench className="h-4 w-4 mr-2" />
            )}
            Синхронизировать услуги
          </Button>
          <Button 
            onClick={handleSyncAll}
            disabled={syncProductsMutation.isPending || syncServicesMutation.isPending}
            data-testid="button-sync-onec-all"
          >
            {(syncProductsMutation.isPending || syncServicesMutation.isPending) ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Синхронизировать всё
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Товары</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-products-count">
              {products.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              из 1С Розница
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Услуги</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-services-count">
              {services.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              из 1С Розница
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего позиций</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">
              {(products.length || 0) + (services.length || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Статус</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge 
              variant={onecStats?.connected ? "default" : "secondary"}
              data-testid="badge-connection-status"
            >
              {onecStats?.connected ? "Подключено" : "Настройка"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Список товаров */}
      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Товары из 1С Розница</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {products.slice(0, 20).map((product: any, index: number) => (
                <div 
                  key={product.externalId || index} 
                  className="flex justify-between items-center p-3 border rounded-lg"
                  data-testid={`card-product-${index}`}
                >
                  <div className="flex-1">
                    <h4 className="font-medium" data-testid={`text-product-name-${index}`}>
                      {product.name}
                    </h4>
                    {product.description && (
                      <p className="text-sm text-muted-foreground">{product.description}</p>
                    )}
                    <div className="flex gap-4 mt-1">
                      {product.category && (
                        <span className="text-xs text-muted-foreground">
                          Категория: {product.category}
                        </span>
                      )}
                      {product.unit && (
                        <span className="text-xs text-muted-foreground">
                          Ед.: {product.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-medium" data-testid={`text-product-price-${index}`}>
                        {product.price ? `${product.price} ₽` : 'Нет цены'}
                      </div>
                      {product.stock !== undefined && (
                        <div className="text-sm text-muted-foreground">
                          Остаток: {product.stock}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" data-testid={`badge-product-system-${index}`}>
                      1С
                    </Badge>
                  </div>
                </div>
              ))}
              {products.length > 20 && (
                <p className="text-center text-muted-foreground">
                  ... и ещё {products.length - 20} товаров
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список услуг */}
      {services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Услуги из 1С Розница</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {services.slice(0, 20).map((service: any, index: number) => (
                <div 
                  key={service.externalId || index} 
                  className="flex justify-between items-center p-3 border rounded-lg"
                  data-testid={`card-service-${index}`}
                >
                  <div className="flex-1">
                    <h4 className="font-medium" data-testid={`text-service-name-${index}`}>
                      {service.name}
                    </h4>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                    <div className="flex gap-4 mt-1">
                      {service.category && (
                        <span className="text-xs text-muted-foreground">
                          Категория: {service.category}
                        </span>
                      )}
                      {service.duration && (
                        <span className="text-xs text-muted-foreground">
                          Длительность: {service.duration} мин
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-medium" data-testid={`text-service-price-${index}`}>
                        {service.price ? `${service.price} ₽` : 'Нет цены'}
                      </div>
                    </div>
                    <Badge variant="outline" data-testid={`badge-service-system-${index}`}>
                      1С
                    </Badge>
                  </div>
                </div>
              ))}
              {services.length > 20 && (
                <p className="text-center text-muted-foreground">
                  ... и ещё {services.length - 20} услуг
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка данных...</span>
        </div>
      )}
    </div>
  );
}