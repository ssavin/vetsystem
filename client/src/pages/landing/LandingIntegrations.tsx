import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, ArrowRight, ExternalLink } from "lucide-react"

const integrations = [
  {
    id: "moysklad",
    name: "МойСклад",
    category: "Складской учёт",
    description: "Синхронизация номенклатуры товаров и услуг, создание фискальных чеков",
    features: [
      "Импорт товаров и услуг из МойСклад",
      "Синхронизация цен и остатков",
      "Создание фискальных чеков",
      "Автоматическое обновление данных",
    ],
    logo: "МС",
    color: "bg-orange-500",
  },
  {
    id: "dreamkas",
    name: "Dreamkas Start",
    category: "Фискализация",
    description: "Интеграция с онлайн-кассами для соблюдения 54-ФЗ",
    features: [
      "Синхронизация номенклатуры",
      "Печать фискальных чеков",
      "Автоматический расчёт НДС",
      "Тестирование соединения",
    ],
    logo: "DK",
    color: "bg-blue-500",
  },
  {
    id: "mango",
    name: "Mango Office",
    category: "Телефония",
    description: "Интеграция с виртуальной АТС для улучшения работы с клиентами",
    features: [
      "Определение клиента по номеру при входящем звонке",
      "Всплывающая карточка клиента",
      "Журнал звонков в карточке клиента",
      "Прослушивание записей разговоров",
    ],
    logo: "MO",
    color: "bg-green-500",
  },
  {
    id: "smsru",
    name: "SMS.RU",
    category: "Уведомления",
    description: "Отправка SMS-уведомлений клиентам",
    features: [
      "Напоминания о визитах",
      "SMS-верификация номера телефона",
      "Двухфакторная аутентификация",
      "Массовые рассылки",
    ],
    logo: "SMS",
    color: "bg-purple-500",
  },
  {
    id: "yookassa",
    name: "YooKassa",
    category: "Платежи",
    description: "Приём онлайн-платежей от клиентов",
    features: [
      "Оплата услуг онлайн",
      "Интеграция с личным кабинетом клиента",
      "Автоматическое подтверждение оплаты",
      "Поддержка всех способов оплаты",
    ],
    logo: "YK",
    color: "bg-sky-500",
  },
  {
    id: "vetis",
    name: "ВетИС Гален",
    category: "Государственные системы",
    description: "Интеграция с государственной информационной системой ВетИС",
    features: [
      "Регистрация животных",
      "Синхронизация UUID",
      "Оформление ветеринарных свидетельств",
      "Соблюдение требований законодательства",
    ],
    logo: "ВИ",
    color: "bg-emerald-500",
  },
]

const categories = [
  { name: "Все", value: "all" },
  { name: "Складской учёт", value: "Складской учёт" },
  { name: "Фискализация", value: "Фискализация" },
  { name: "Телефония", value: "Телефония" },
  { name: "Уведомления", value: "Уведомления" },
  { name: "Платежи", value: "Платежи" },
  { name: "Государственные системы", value: "Государственные системы" },
]

export default function LandingIntegrations() {
  return (
    <div className="py-12 md:py-20">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Интеграции</h1>
          <p className="text-xl text-muted-foreground">
            Подключайте сервисы, которые уже используете. 
            VetSystemAI легко интегрируется с популярными решениями.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <Card key={integration.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className={`w-12 h-12 ${integration.color} rounded-lg flex items-center justify-center text-white font-bold`}>
                    {integration.logo}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <span className="text-xs text-muted-foreground">{integration.category}</span>
                  </div>
                </div>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {integration.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Card className="inline-block p-8 max-w-2xl">
            <h3 className="text-2xl font-bold mb-4">Нужна другая интеграция?</h3>
            <p className="text-muted-foreground mb-6">
              Мы постоянно расширяем список интеграций. 
              Свяжитесь с нами, если вам нужна интеграция с сервисом, которого нет в списке.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/demo">
                <Button>
                  Обсудить интеграцию
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline">
                API документация
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
