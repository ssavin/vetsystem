import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Cloud, Shield, Smartphone, Zap, BarChart3, Puzzle,
  Users, Calendar, Stethoscope, Microscope, Bed, CreditCard, FileText, Tablet,
  CheckCircle2, ArrowRight
} from "lucide-react"

const benefits = [
  {
    icon: Cloud,
    title: "Облачная платформа",
    description: "Работайте из любого места. Данные всегда доступны и защищены."
  },
  {
    icon: Shield,
    title: "Безопасность данных",
    description: "Шифрование, соответствие ФЗ-152, хранение в России."
  },
  {
    icon: Smartphone,
    title: "Мобильное приложение",
    description: "Клиенты записываются сами и получают напоминания."
  },
  {
    icon: Zap,
    title: "Автоматизация",
    description: "Счета, напоминания, отчёты формируются автоматически."
  },
  {
    icon: BarChart3,
    title: "Аналитика",
    description: "Понимайте свой бизнес с помощью наглядных отчётов."
  },
  {
    icon: Puzzle,
    title: "Интеграции",
    description: "Подключение к кассам, телефонии, складу."
  },
]

const modules = [
  { icon: Users, title: "Регистратура", description: "Управление клиентами и пациентами", href: "/features/registry" },
  { icon: Calendar, title: "Расписание", description: "Запись на приём и календарь", href: "/features/schedule" },
  { icon: Stethoscope, title: "Медкарты", description: "Электронная история болезни", href: "/features/medical-records" },
  { icon: Microscope, title: "Лаборатория", description: "Анализы и исследования", href: "/features/laboratory" },
  { icon: Bed, title: "Стационар", description: "Госпитализация и уход", href: "/features/hospital" },
  { icon: CreditCard, title: "Финансы", description: "Счета, оплаты, касса", href: "/features/finance" },
  { icon: FileText, title: "Отчёты", description: "Аналитика и статистика", href: "/features/reports" },
  { icon: Tablet, title: "Мобильное приложение", description: "Для владельцев животных", href: "/features/mobile-app" },
]

const stats = [
  { value: "500+", label: "клиник доверяют нам" },
  { value: "1 000 000+", label: "обслуженных пациентов" },
  { value: "99.9%", label: "uptime платформы" },
  { value: "24/7", label: "техническая поддержка" },
]

const integrations = [
  { name: "МойСклад", logo: "/integrations/moysklad.svg" },
  { name: "Dreamkas", logo: "/integrations/dreamkas.svg" },
  { name: "Mango Office", logo: "/integrations/mango.svg" },
  { name: "SMS.RU", logo: "/integrations/smsru.svg" },
  { name: "YooKassa", logo: "/integrations/yookassa.svg" },
  { name: "ВетИС Гален", logo: "/integrations/vetis.svg" },
]

export default function LandingHome() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Умная платформа для{" "}
              <span className="text-primary">ветеринарных клиник</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Автоматизируйте работу клиники, увеличьте выручку и освободите время 
              для главного — заботы о животных
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/demo">
                <Button size="lg" className="w-full sm:w-auto">
                  Запросить демо
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Узнать больше
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Почему VetSystemAI?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Современная платформа, созданная специально для ветеринарных клиник России
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="hover-elevate">
                <CardHeader>
                  <benefit.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Модули системы</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Все инструменты для эффективной работы клиники в одном месте
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((module) => (
              <Link key={module.title} href={module.href}>
                <Card className="h-full hover-elevate cursor-pointer transition-all hover:border-primary/50">
                  <CardHeader className="pb-2">
                    <module.icon className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-base">{module.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">{module.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/features">
              <Button variant="outline">
                Все возможности
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-primary-foreground/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Интеграции</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Подключайте сервисы, которые уже используете
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {integrations.map((integration) => (
              <div 
                key={integration.name}
                className="flex items-center justify-center p-4 bg-muted/50 rounded-lg min-w-[120px]"
              >
                <span className="text-sm font-medium text-muted-foreground">{integration.name}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/integrations">
              <Button variant="outline">
                Все интеграции
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pet Owners Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <Smartphone className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-3xl font-bold">Для владельцев животных</h2>
            <p className="text-muted-foreground">
              Ваша клиника уже работает с VetSystemAI? 
              Войдите в личный кабинет, чтобы записаться на приём, 
              посмотреть историю визитов и документы ваших питомцев.
            </p>
            <Link href="/pet-owners/login">
              <Button size="lg">
                Войти в личный кабинет
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-8 md:p-12">
              <div className="max-w-2xl mx-auto text-center space-y-6">
                <h2 className="text-3xl font-bold">Готовы начать?</h2>
                <p className="text-primary-foreground/80">
                  Запишитесь на бесплатную демонстрацию и узнайте, 
                  как VetSystemAI может помочь вашей клинике
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/demo">
                    <Button size="lg" variant="secondary">
                      Запросить демо
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                      Посмотреть цены
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
