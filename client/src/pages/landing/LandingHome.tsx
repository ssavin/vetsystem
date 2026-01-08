import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Cloud, Shield, Smartphone, Zap, BarChart3, Puzzle,
  Users, Calendar, Stethoscope, Microscope, Bed, CreditCard, FileText, Tablet,
  CheckCircle2, ArrowRight, Star, Quote
} from "lucide-react"

import heroImage from "@assets/generated-image-1_(1)_1767847112592.jpg"
import petsImage from "@assets/stock_images/cute_dog_and_cat_tog_b965a2f6.jpg"
import clinicImage from "@assets/stock_images/veterinary_clinic_in_690194f4.jpg"
import ownerImage from "@assets/stock_images/happy_pet_owner_with_b22b3b02.jpg"

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
    description: "Подключение к кассам, телефонии, лаборатории."
  },
]

const modules = [
  { icon: Users, title: "Регистратура", description: "Управление клиентами и пациентами" },
  { icon: Calendar, title: "Расписание", description: "Запись на приём и календарь" },
  { icon: Stethoscope, title: "Медкарты", description: "Электронная история болезни" },
  { icon: Microscope, title: "Лаборатория", description: "Анализы и исследования" },
  { icon: Bed, title: "Стационар", description: "Госпитализация и уход" },
  { icon: CreditCard, title: "Финансы", description: "Счета, оплаты, касса" },
  { icon: FileText, title: "Отчёты", description: "Аналитика и статистика" },
  { icon: Tablet, title: "Мобильные приложения", description: "Для владельцев и врачей" },
]

const stats = [
  { value: "500+", label: "клиник" },
  { value: "1M+", label: "пациентов" },
  { value: "99.9%", label: "uptime" },
  { value: "24/7", label: "поддержка" },
]

const testimonials = [
  {
    name: "Анна Петрова",
    role: "Главный врач, ВетКлиника Плюс",
    text: "VetSystem полностью изменил нашу работу. Теперь мы тратим на документацию в 3 раза меньше времени!",
    rating: 5
  },
  {
    name: "Михаил Сидоров",
    role: "Владелец, Ветеринарный центр Дружок",
    text: "Отличная система! Особенно радует интеграция с лабораторным оборудованием и автоматические напоминания.",
    rating: 5
  },
  {
    name: "Елена Козлова",
    role: "Администратор, Клиника Айболит",
    text: "Клиенты довольны мобильным приложением, а мы - удобной аналитикой и CRM.",
    rating: 5
  },
]

const integrations = [
  "МойСклад", "Dreamkas", "Mango Office", "SMS.RU", "YooKassa", 
  "Invitro Vet", "Chance Bio", "DICOM"
]

export default function LandingHome() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-16 md:py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-6">
              <Badge variant="secondary" className="text-sm">
                Платформа нового поколения
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Современная платформа для{" "}
                <span className="text-primary">ветеринарных клиник</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                Автоматизируйте работу клиники, увеличьте выручку и освободите время 
                для главного — заботы о животных
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-2">
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

              <div className="flex flex-wrap items-center gap-6 pt-4 border-t">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">Более 500 клиник доверяют нам</span>
              </div>
            </div>

            <div className="relative">
              <img 
                src={heroImage} 
                alt="Ветеринарная клиника" 
                className="rounded-2xl shadow-lg w-full aspect-[4/3] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center text-primary-foreground">
                <div className="text-3xl md:text-4xl font-bold">{stat.value}</div>
                <div className="text-sm opacity-80 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative order-2 lg:order-1">
              <img 
                src={clinicImage} 
                alt="Современная ветеринарная клиника" 
                className="rounded-2xl shadow-lg w-full aspect-[4/3] object-cover"
              />
            </div>
            
            <div className="space-y-8 order-1 lg:order-2">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Почему выбирают VetSystem?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Современная платформа, созданная специально для ветеринарных клиник России
                </p>
              </div>
              
              <div className="grid gap-5">
                {benefits.slice(0, 4).map((benefit) => (
                  <div 
                    key={benefit.title} 
                    className="flex items-start gap-4"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-16 md:py-24 bg-muted/40">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Модули системы</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Все инструменты для эффективной работы клиники в одном месте
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {modules.map((module) => (
              <div 
                key={module.title}
                className="bg-background rounded-xl p-5 border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4">
                  <module.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{module.title}</h3>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link href="/features">
              <Button variant="outline">
                Все возможности
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Отзывы клиентов</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Более 500 клиник уже работают с VetSystem
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-6">
                  <div className="flex mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-5">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-12 bg-muted/40">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="text-center mb-8">
            <h3 className="text-lg font-semibold mb-2">Интеграции с популярными сервисами</h3>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
            {integrations.map((name) => (
              <div 
                key={name}
                className="px-4 py-2 bg-background rounded-full border text-sm"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pet Owners Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-6">
              <Badge variant="secondary">Для владельцев животных</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Мобильное приложение для ваших клиентов
              </h2>
              <p className="text-lg text-muted-foreground">
                Владельцы питомцев могут записываться на приём, просматривать историю 
                визитов и получать напоминания о вакцинации прямо в телефоне.
              </p>
              <ul className="space-y-3">
                {[
                  "Онлайн-запись на приём в любое время",
                  "История визитов и медицинские документы",
                  "Push-уведомления о вакцинации и обработках",
                  "Чат с врачом клиники"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pet-owners/login">
                <Button size="lg">
                  Войти в личный кабинет
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="relative">
              <img 
                src={ownerImage} 
                alt="Счастливый владелец с питомцем" 
                className="rounded-2xl shadow-lg w-full aspect-[4/3] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Готовы улучшить работу вашей клиники?
            </h2>
            <p className="text-lg opacity-90">
              Запишитесь на бесплатную демонстрацию и узнайте, 
              как VetSystem может помочь вашему бизнесу
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center pt-2">
              <Link href="/demo">
                <Button size="lg" variant="secondary">
                  Запросить демо
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground bg-primary-foreground/10">
                  Посмотреть цены
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
