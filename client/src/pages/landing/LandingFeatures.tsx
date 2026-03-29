import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, Calendar, Stethoscope, Microscope, Bed, CreditCard, FileText, Tablet,
  ArrowRight, CheckCircle2, MonitorUp, UserCog, Heart, PenLine
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
      "Электронная подпись клиента прямо на экране планшета",
      "Юридически значимые подписанные PDF-документы",
      "Поддержка стандартов ветеринарной документации",
    ]
  },
  {
    id: "laboratory",
    icon: Microscope,
    title: "Лаборатория",
    description: "Полный цикл лабораторных исследований — от направления до печати результата",
    features: [
      "Создание направлений с автонумерацией и статусами",
      "Каталог исследований и параметров с единицами измерения",
      "Ввод результатов по каждому параметру",
      "Автоматическая подсветка отклонений (норма / патология / критично)",
      "Референсные значения по виду и породе животного",
      "Печать официального бланка результатов",
      "Привязка анализов к визиту и медкарте пациента",
      "Интеграция с Invitro Vet, Vet Union, Chance Bio",
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
    title: "Отчёты и аналитика",
    description: "Продвинутая бизнес-аналитика в реальном времени",
    features: [
      "Интерактивные дашборды с KPI клиники",
      "Финансовая аналитика: выручка, средний чек, динамика",
      "Воронка продаж и конверсия записей",
      "Анализ эффективности врачей и услуг",
      "Прогнозирование загрузки и выручки",
      "Сравнение периодов и филиалов",
      "Автоматические отчёты руководителю",
      "Экспорт в Excel и PDF",
    ]
  },
  {
    id: "mobile-app-owners",
    icon: Tablet,
    title: "Приложение для владельцев",
    description: "Мобильное приложение для клиентов клиники",
    features: [
      "Авторизация по SMS-коду",
      "Профили всех питомцев с историей",
      "Онлайн-запись на приём",
      "История визитов и назначения",
      "Доступ к медицинским документам",
      "Push-уведомления о визитах и вакцинации",
    ]
  },
  {
    id: "mobile-app-doctors",
    icon: Stethoscope,
    title: "Приложение для врачей",
    description: "Мобильное рабочее место ветеринарного врача",
    features: [
      "Расписание приёмов на сегодня",
      "Электронная очередь пациентов",
      "Быстрый осмотр и запись в карту",
      "Просмотр истории болезни",
      "Назначение лечения и процедур",
      "Офлайн-режим для работы без связи",
    ]
  },
  {
    id: "crm",
    icon: UserCog,
    title: "CRM и сегментация клиентов",
    description: "Управление клиентской базой с автоматической сегментацией",
    features: [
      "Автоматическая сегментация: VIP, постоянные, новые, спящие",
      "Гибкие фильтры по видам животных, услугам, сумме чека",
      "Напоминания о вакцинации и профилактических обработках",
      "Маркетинговые рассылки (SMS, email, push) по сегментам",
      "История взаимодействий и сводка по клиенту",
      "Анализ оттока и кампании по возврату клиентов",
    ]
  },
  {
    id: "loyalty",
    icon: Heart,
    title: "Программа лояльности",
    description: "Бонусная система для удержания и возврата клиентов",
    features: [
      "Многоуровневая система (Стандарт, Серебро, Золото, Платина)",
      "Гибкие правила начисления бонусов за услуги и товары",
      "Кешбэк до 10% в зависимости от уровня клиента",
      "Автоматическое повышение уровня по сумме покупок",
      "Списание бонусов при оплате счёта",
      "История операций с балансом по каждому клиенту",
      "Виджет баланса в карточке клиента",
    ]
  },
  {
    id: "e-signature",
    icon: PenLine,
    title: "Электронная подпись",
    description: "Сбор подписей клиентов прямо на экране планшета или ПК",
    features: [
      "Подпись пальцем или стилусом на сенсорном экране",
      "Встроенный виджет подписи в любом документе",
      "Подпись сохраняется в базе и встраивается в PDF",
      "Поддержка информированных согласий, актов и договоров",
      "Журнал подписанных документов с датой и именем подписанта",
      "Защита от подмены: подпись привязана к документу и пациенту",
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
