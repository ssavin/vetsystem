import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Package, Plus, Minus, AlertTriangle, Clock, DollarSign } from "lucide-react"
import { useState } from "react"

interface ServiceItemProps {
  service: {
    id: string
    name: string
    category: string
    type: 'service' | 'product'
    price: number
    duration?: number // in minutes, for services
    stock?: number // for products
    minStock?: number // for products
    unit?: string // for products
    description?: string
    isActive: boolean
  }
}

export default function ServiceItem({ service }: ServiceItemProps) {
  const [quantity, setQuantity] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)

  const isLowStock = service.type === 'product' && service.stock !== undefined && service.minStock !== undefined && service.stock <= service.minStock

  const addToCart = () => {
    console.log(`Added ${quantity} x ${service.name} to cart`)
    setQuantity(1)
  }

  const getTypeIcon = () => {
    return service.type === 'service' ? <Clock className="h-4 w-4" /> : <Package className="h-4 w-4" />
  }

  return (
    <Card className={`hover-elevate ${!service.isActive ? 'opacity-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getTypeIcon()}
            <div>
              <CardTitle className="text-lg" data-testid={`text-service-name-${service.id}`}>
                {service.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {service.category}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold" data-testid={`text-service-price-${service.id}`}>
              {service.price.toLocaleString('ru-RU')} ₽
            </div>
            {service.duration && (
              <Badge variant="secondary">{service.duration} мин</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {service.type === 'product' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Остаток: {service.stock} {service.unit}
              </span>
              {isLowStock && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Мало товара
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-6 w-6"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                data-testid={`button-decrease-quantity-${service.id}`}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-center h-6"
                min="1"
                data-testid={`input-quantity-${service.id}`}
              />
              <Button
                size="icon"
                variant="outline"
                className="h-6 w-6"
                onClick={() => setQuantity(quantity + 1)}
                data-testid={`button-increase-quantity-${service.id}`}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {service.description && (
          <div 
            className={`text-sm text-muted-foreground cursor-pointer ${!isExpanded ? 'line-clamp-2' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {service.description}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={addToCart}
            disabled={!service.isActive || (service.type === 'product' && (service.stock === 0))}
            className="flex-1"
            data-testid={`button-add-service-${service.id}`}
          >
            <Plus className="h-3 w-3 mr-1" />
            {service.type === 'service' ? 'Добавить услугу' : 'В корзину'}
          </Button>
          
          {service.type === 'service' && (
            <div className="flex items-center gap-1 px-3 py-2 bg-muted rounded-md text-sm">
              <DollarSign className="h-3 w-3" />
              {(service.price * quantity).toLocaleString('ru-RU')} ₽
            </div>
          )}
          
          {service.type === 'product' && (
            <div className="flex items-center gap-1 px-3 py-2 bg-muted rounded-md text-sm">
              <DollarSign className="h-3 w-3" />
              {(service.price * quantity).toLocaleString('ru-RU')} ₽
            </div>
          )}
        </div>

        {!service.isActive && (
          <div className="text-sm text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Услуга/товар временно недоступен
          </div>
        )}
      </CardContent>
    </Card>
  )
}