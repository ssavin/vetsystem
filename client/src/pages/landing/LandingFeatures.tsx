import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, Calendar, Stethoscope, Microscope, Bed, CreditCard, FileText, Tablet,
  ArrowRight, CheckCircle2, MonitorUp, UserCog
} from "lucide-react"

const modules = [
  {
    id: "registry",
    icon: Users,
    title: "Регистратура",
    description: "Полное управление клиентами и пациентами",
    features: [
      "Быстрый поиск по ФИО, телефону, микрочипу",
      "Карточка клиента с полной информацией",
      "Карточка пациента с историей болезни",
      "Несколько владельцев для одного питомца",
      "Согласие на обработку персональных данных",
      "Интеграция с телефонией (история звонков)",
    ]
  },
  {
    id: "schedule",
    icon: Calendar,
    title: "Расписание",
    description: "Эффективное управление записями",
    features: [
      "Визуальный календарь на день/неделю/месяц",
      "Запись на приём в один клик",
      "SMS и push-напоминания клиентам",
      "Управление расписанием врачей",
      "Онлайн-запись через мобильное приложение",
      "Цветовая маркировка по статусам",
    ]
  },
  {
    id: "medical-records",
    icon: Stethoscope,
    title: "Медицинские карты",
    description: "Электронная история болезни",
    features: [
      "Структурированные записи осмотров",
      "Клинические случаи с группировкой визитов",
      "Шаблоны протоколов лечения",
      "Прикрепление файлов и изображений",
      "Генерация документов (выписки, справки)",
      "Поддержка стандартов ветеринарной документации",
    ]
  },
  {
    id: "laboratory",
    icon: Microscope,
    title: "Лаборатория",
    description: "Полный цикл лабораторных исследований с интеграцией оборудования",
    features: [
      "Направления на анализы с автозаполнением",
      "Интеграция с анализаторами по ASTM/LIS2-A2",
      "Поддержка Invitro Vet, Vet Union, Chance Bio",
      "Автоматический приём результатов от оборудования",
      "Референсные значения с интерпретацией",
      "Печать результатов и экспорт данных",
    ]
  },
  {
    id: "dicom",
    icon: MonitorUp,
    title: "DICOM-визуализация",
    description: "Интеграция с рентгеном, УЗИ и другим диагностическим оборудованием",
    features: [
      "Просмотр DICOM-снимков в браузере",
      "Подключение рентген-аппаратов и УЗИ",
      "Хранение исследований в карточке пациента",
      "Инструменты измерения и аннотации",
      "Экспорт снимков в PDF и JPEG",
      "Поддержка DICOM Worklist",
    ]
  },
  {
    id: "hospital",
    icon: Bed,
    title: "Стационар",
    description: "Управление госпитализацией",
    features: [
      "Учёт клеток (статус, размер, тип)",
      "Оформление госпитализации",
      "Журнал процедур и назначений",
      "Автоматическое начисление за содержание",
      "Контроль состояния пациентов",
      "Изоляция данных по филиалам",
    ]
  },
  {
    id: "finance",
    icon: CreditCard,
    title: "Финансы",
    description: "Полный финансовый учёт",
    features: [
      "Создание и управление счетами",
      "Приём оплаты (наличные, карта, онлайн)",
      "Фискализация чеков по 54-ФЗ",
      "Учёт долгов и авансов",
      "Скидки и акции",
      "Интеграция с бухгалтерией",
    ]
  },
  {
    id: "reports",
    icon: FileText,
    title: "Отчёты",
    description: "Аналитика для принятия решений",
    features: [
      "Финансовая аналитика по периодам",
      "Отчёты по врачам (выручка, количество приёмов)",
      "Статистика по услугам и товарам",
      "Анализ клиентской базы",
      "Экспорт в Excel",
      "Кастомизируемые дашборды",
    ]
  },
  {
    id: "mobile-app",
    icon: Tablet,
    title: "Мобильное приложение",
    description: "Для владельцев животных",
    features: [
      "Авторизация по SMS-коду",
      "Профили всех питомцев",
      "Онлайн-запись на приём",
      "История визитов и назначения",
      "Медицинские документы",
      "Push-уведомления о визитах",
    ]
  },
  {
    id: "crm",
    icon: UserCog,
    title: "CRM-система",
    description: "Управление отношениями с клиентами",
    features: [
      "Автоматическая сегментация (VIP, постоянные, новые)",
      "Напоминания о вакцинации и обработках",
      "Маркетинговые рассылки (SMS, email, push)",
      "История взаимодействий с клиентом",
      "Анализ оттока и возвращение клиентов",
      "Целевые кампании по сегментам",
    ]
  },
]

export default function LandingFeatures() {
  return (
    <div className="py-12 md:py-20">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Возможности VetSystemAI</h1>
          <p className="text-xl text-muted-foreground">
            Все инструменты для эффективной работы ветеринарной клиники
          </p>
        </div>

        <div className="space-y-12">
          {modules.map((module, index) => (
            <Card key={module.id} className="overflow-hidden">
              <div className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
                <div className="lg:w-1/2 p-6 md:p-8 lg:p-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <module.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">{module.title}</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">{module.description}</p>
                  <ul className="space-y-3">
                    {module.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:w-1/2 bg-muted/50 p-6 md:p-8 lg:p-12 flex items-center justify-center">
                  <div className="w-full max-w-md aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                    <module.icon className="h-20 w-20 text-primary/30" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Card className="inline-block p-8">
            <h3 className="text-2xl font-bold mb-4">Хотите увидеть систему в действии?</h3>
            <p className="text-muted-foreground mb-6">
              Запишитесь на бесплатную демонстрацию и мы покажем все возможности
            </p>
            <Link href="/demo">
              <Button size="lg">
                Запросить демо
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
