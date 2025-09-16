import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Calendar, User, DollarSign, FileText, Printer, CreditCard, Check } from "lucide-react"
import { useState } from "react"

interface InvoiceItem {
  id: string
  name: string
  type: 'service' | 'product'
  quantity: number
  price: number
  total: number
}

interface InvoiceCardProps {
  invoice: {
    id: string
    date: string
    patientName: string
    ownerName: string
    items: InvoiceItem[]
    subtotal: number
    discount?: number
    total: number
    status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
    paymentMethod?: string
    dueDate?: string
    notes?: string
  }
}

export default function InvoiceCard({ invoice }: InvoiceCardProps) {
  const [currentStatus, setCurrentStatus] = useState(invoice.status)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
          text: 'Черновик'
        }
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
          text: 'Ожидает оплаты'
        }
      case 'paid':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          text: 'Оплачен'
        }
      case 'overdue':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
          text: 'Просрочен'
        }
      case 'cancelled':
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
          text: 'Отменен'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
          text: 'Неизвестно'
        }
    }
  }

  const statusConfig = getStatusConfig(currentStatus)

  const markAsPaid = () => {
    setCurrentStatus('paid')
    console.log(`Invoice ${invoice.id} marked as paid`)
  }

  const printInvoice = () => {
    console.log(`Printing invoice ${invoice.id}`)
  }

  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg" data-testid={`text-invoice-id-${invoice.id}`}>
                Счет #{invoice.id}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {invoice.date}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {invoice.ownerName}
                </span>
              </div>
            </div>
          </div>
          <Badge className={statusConfig.color} data-testid={`status-invoice-${invoice.id}`}>
            {statusConfig.text}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm">
          <span className="font-medium">Пациент:</span> {invoice.patientName}
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Услуги и товары:</h4>
          <div className="space-y-1">
            {invoice.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div className="flex-1">
                  <span>{item.name}</span>
                  {item.quantity > 1 && (
                    <span className="text-muted-foreground ml-1">x{item.quantity}</span>
                  )}
                </div>
                <span className="font-medium" data-testid={`text-item-total-${item.id}`}>
                  {item.total.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Подытог:</span>
            <span>{invoice.subtotal.toLocaleString('ru-RU')} ₽</span>
          </div>
          {invoice.discount && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Скидка:</span>
              <span>-{invoice.discount.toLocaleString('ru-RU')} ₽</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>Итого:</span>
            <span data-testid={`text-invoice-total-${invoice.id}`}>
              {invoice.total.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        {invoice.paymentMethod && (
          <div className="text-sm text-muted-foreground">
            Способ оплаты: {invoice.paymentMethod}
          </div>
        )}

        {invoice.dueDate && currentStatus === 'pending' && (
          <div className="text-sm text-muted-foreground">
            Срок оплаты: {invoice.dueDate}
          </div>
        )}

        {invoice.notes && (
          <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
            {invoice.notes}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={printInvoice}
            data-testid={`button-print-invoice-${invoice.id}`}
          >
            <Printer className="h-3 w-3 mr-1" />
            Печать
          </Button>

          {currentStatus === 'pending' && (
            <Button 
              size="sm" 
              onClick={markAsPaid}
              data-testid={`button-mark-paid-${invoice.id}`}
            >
              <Check className="h-3 w-3 mr-1" />
              Оплачен
            </Button>
          )}

          {currentStatus === 'draft' && (
            <Button 
              size="sm" 
              data-testid={`button-send-invoice-${invoice.id}`}
            >
              <CreditCard className="h-3 w-3 mr-1" />
              Отправить
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}