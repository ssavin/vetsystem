import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, X, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Старт",
    description: "Для небольших клиник",
    price: "9 900",
    period: "месяц",
    popular: false,
    features: [
      { text: "1 филиал", included: true },
      { text: "До 5 пользователей", included: true },
      { text: "5 ГБ хранилища", included: true },
      { text: "Регистратура", included: true },
      { text: "Расписание", included: true },
      { text: "Медицинские карты", included: true },
      { text: "Финансы и счета", included: true },
      { text: "Базовые отчёты", included: true },
      { text: "Email-поддержка", included: true },
      { text: "Лаборатория", included: false },
      { text: "Стационар", included: false },
      { text: "Мобильное приложение", included: false },
      { text: "Интеграции", included: false },
    ]
  },
  {
    name: "Профи",
    description: "Для растущих клиник",
    price: "24 900",
    period: "месяц",
    popular: true,
    features: [
      { text: "До 3 филиалов", included: true },
      { text: "До 15 пользователей", included: true },
      { text: "25 ГБ хранилища", included: true },
      { text: "Регистратура", included: true },
      { text: "Расписание", included: true },
      { text: "Медицинские карты", included: true },
      { text: "Финансы и счета", included: true },
      { text: "Расширенные отчёты", included: true },
      { text: "Email + чат поддержка", included: true },
      { text: "Лаборатория", included: true },
      { text: "Стационар", included: true },
      { text: "Мобильное приложение", included: true },
      { text: "Все интеграции", included: true },
    ]
  },
  {
    name: "Бизнес",
    description: "Для сетей клиник",
    price: "По запросу",
    period: "",
    popular: false,
    features: [
      { text: "Неограниченно филиалов", included: true },
      { text: "Неограниченно пользователей", included: true },
      { text: "100 ГБ хранилища", included: true },
      { text: "Все модули системы", included: true },
      { text: "Персональный менеджер", included: true },
      { text: "Приоритетная поддержка", included: true },
      { text: "Кастомные интеграции", included: true },
      { text: "API для внешних систем", included: true },
      { text: "SLA гарантии", included: true },
      { text: "Обучение на месте", included: true },
      { text: "Миграция данных", included: true },
      { text: "Брендирование", included: true },
      { text: "Выделенный сервер", included: true },
    ]
  },
]

const faqs = [
  {
    question: "Есть ли пробный период?",
    answer: "Да, мы предоставляем 14 дней бесплатного пробного периода с полным функционалом тарифа Профи. Кредитная карта не требуется."
  },
  {
    question: "Как происходит оплата?",
    answer: "Оплата производится ежемесячно или ежегодно (со скидкой 20%). Принимаем банковские карты, безналичный расчёт для юридических лиц."
  },
  {
    question: "Можно ли сменить тариф?",
    answer: "Да, вы можете перейти на другой тариф в любое время. При повышении тарифа изменения вступают в силу сразу, при понижении — со следующего расчётного периода."
  },
  {
    question: "Что входит во внедрение?",
    answer: "Базовое внедрение включает настройку системы, импорт данных, онлайн-обучение персонала. Для тарифа Бизнес доступно выездное обучение."
  },
  {
    question: "Сколько времени занимает внедрение?",
    answer: "Стандартное внедрение занимает 3-5 рабочих дней. Для сетей клиник срок обсуждается индивидуально."
  },
  {
    question: "Есть ли ограничения по количеству пациентов?",
    answer: "Нет, количество записей о клиентах и пациентах не ограничено на всех тарифах."
  },
]

export default function LandingPricing() {
  return (
    <div className="py-12 md:py-20">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Простые и понятные цены</h1>
          <p className="text-xl text-muted-foreground">
            Выберите тариф, который подходит вашей клинике. 
            Все цены включают поддержку и обновления.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={cn(
                "relative flex flex-col",
                plan.popular && "border-primary shadow-lg"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Популярный
                  </span>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground ml-1">₽/{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2">
                      {feature.included ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={cn(
                        "text-sm",
                        !feature.included && "text-muted-foreground/50"
                      )}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/demo" className="w-full">
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.price === "По запросу" ? "Связаться" : "Попробовать бесплатно"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Часто задаваемые вопросы</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Остались вопросы? Свяжитесь с нами для консультации
          </p>
          <Link href="/demo">
            <Button size="lg">
              Запросить демо
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
