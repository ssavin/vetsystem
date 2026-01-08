import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Cloud, Shield, Smartphone, Zap, BarChart3, Puzzle,
  Users, Calendar, Stethoscope, Microscope, Bed, CreditCard, FileText, Tablet,
  CheckCircle2, ArrowRight, Play, Star, Quote, Heart, Clock, TrendingUp
} from "lucide-react"

import heroImage from "@assets/stock_images/veterinarian_examini_5dfaa1b0.jpg"
import heroImage2 from "@assets/stock_images/veterinary_doctor_wi_bf21fe42.jpg"
import petsImage from "@assets/stock_images/cute_dog_and_cat_tog_b965a2f6.jpg"
import clinicImage from "@assets/stock_images/veterinary_clinic_in_690194f4.jpg"
import ownerImage from "@assets/stock_images/happy_pet_owner_with_b22b3b02.jpg"

const benefits = [
  {
    icon: Cloud,
    title: "Облачная платформа",
    description: "Работайте из любого места. Данные всегда доступны и защищены.",
    color: "from-blue-500/20 to-cyan-500/20"
  },
  {
    icon: Shield,
    title: "Безопасность данных",
    description: "Шифрование, соответствие ФЗ-152, хранение в России.",
    color: "from-green-500/20 to-emerald-500/20"
  },
  {
    icon: Smartphone,
    title: "Мобильное приложение",
    description: "Клиенты записываются сами и получают напоминания.",
    color: "from-purple-500/20 to-pink-500/20"
  },
  {
    icon: Zap,
    title: "Автоматизация",
    description: "Счета, напоминания, отчёты формируются автоматически.",
    color: "from-yellow-500/20 to-orange-500/20"
  },
  {
    icon: BarChart3,
    title: "Аналитика",
    description: "Понимайте свой бизнес с помощью наглядных отчётов.",
    color: "from-indigo-500/20 to-violet-500/20"
  },
  {
    icon: Puzzle,
    title: "Интеграции",
    description: "Подключение к кассам, телефонии, лаборатории.",
    color: "from-rose-500/20 to-red-500/20"
  },
]

const modules = [
  { icon: Users, title: "Регистратура", description: "Управление клиентами и пациентами", href: "/features" },
  { icon: Calendar, title: "Расписание", description: "Запись на приём и календарь", href: "/features" },
  { icon: Stethoscope, title: "Медкарты", description: "Электронная история болезни", href: "/features" },
  { icon: Microscope, title: "Лаборатория", description: "Анализы и исследования", href: "/features" },
  { icon: Bed, title: "Стационар", description: "Госпитализация и уход", href: "/features" },
  { icon: CreditCard, title: "Финансы", description: "Счета, оплаты, касса", href: "/features" },
  { icon: FileText, title: "Отчёты", description: "Аналитика и статистика", href: "/features" },
  { icon: Tablet, title: "Мобильные приложения", description: "Для владельцев и врачей", href: "/features" },
]

const stats = [
  { value: "500+", label: "клиник доверяют нам", icon: Heart },
  { value: "1M+", label: "обслуженных пациентов", icon: Stethoscope },
  { value: "99.9%", label: "uptime платформы", icon: Clock },
  { value: "24/7", label: "техническая поддержка", icon: TrendingUp },
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
      <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden bg-gradient-to-br from-background via-muted/30 to-primary/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <Badge className="px-4 py-2">
                Платформа нового поколения
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Умная платформа для{" "}
                <span className="text-primary">
                  ветеринарных клиник
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                Автоматизируйте работу клиники, увеличьте выручку и освободите время 
                для главного — заботы о животных
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4">
                <Link href="/demo">
                  <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/30">
                    Запросить демо
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/features">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    <Play className="mr-2 h-5 w-5" />
                    Узнать больше
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-8 pt-6">
                <div className="flex -space-x-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 border-2 border-background flex items-center justify-center text-white text-xs font-bold">
                      {['А', 'М', 'Е', 'К', 'Д'][i-1]}
                    </div>
                  ))}
                </div>
                <div className="text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm">500+ довольных клиник</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-2xl" />
              <div className="relative grid grid-cols-2 gap-4">
                <img 
                  src={heroImage} 
                  alt="Ветеринар с собакой" 
                  className="rounded-2xl shadow-2xl w-full aspect-[3/4] object-cover"
                />
                <img 
                  src={heroImage2} 
                  alt="Ветеринар с кошкой" 
                  className="rounded-2xl shadow-2xl w-full aspect-[3/4] object-cover mt-8"
                />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-card p-4 rounded-xl shadow-xl border flex items-center gap-4">
                <div className="p-2 rounded-full bg-green-500/10">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <div className="text-lg font-bold">+40%</div>
                  <div className="text-xs text-muted-foreground">рост эффективности</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center text-primary-foreground">
                <stat.icon className="h-8 w-8 mx-auto mb-3 opacity-80" />
                <div className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section with Image */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-2xl" />
              <img 
                src={clinicImage} 
                alt="Современная ветеринарная клиника" 
                className="relative rounded-2xl shadow-2xl w-full aspect-[4/3] object-cover"
              />
              <div className="absolute -bottom-6 -right-6 bg-card p-6 rounded-xl shadow-xl border">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">+40%</div>
                    <div className="text-sm text-muted-foreground">рост эффективности</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              <div>
                <Badge className="mb-4">Преимущества</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Почему выбирают VetSystem?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Современная платформа, созданная специально для ветеринарных клиник России
                </p>
              </div>
              
              <div className="grid gap-4">
                {benefits.slice(0, 4).map((benefit) => (
                  <div 
                    key={benefit.title} 
                    className={`flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r ${benefit.color} border border-border/50`}
                  >
                    <div className="p-2 rounded-lg bg-background shadow-sm">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{benefit.title}</h3>
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
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4">Функциональность</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Модули системы</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Все инструменты для эффективной работы клиники в одном месте
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module, index) => (
              <Link key={module.title} href={module.href}>
                <Card className="h-full hover-elevate cursor-pointer transition-all duration-300 hover:border-primary/50 hover:-translate-y-1 group">
                  <CardHeader className="pb-3">
                    <div className="p-3 rounded-xl bg-primary/10 w-fit mb-3 group-hover:bg-primary/20 transition-colors">
                      <module.icon className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{module.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link href="/features">
              <Button size="lg" variant="outline">
                Все возможности
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4">Отзывы</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Нам доверяют</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Более 500 клиник уже работают с VetSystem
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="relative overflow-hidden">
                <div className="absolute top-4 right-4 opacity-10">
                  <Quote className="h-16 w-16" />
                </div>
                <CardContent className="pt-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 relative z-10">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-bold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10">
            <h3 className="text-xl font-semibold mb-2">Интеграции с популярными сервисами</h3>
            <p className="text-muted-foreground">Подключайте то, что уже используете</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
            {integrations.map((name) => (
              <div 
                key={name}
                className="px-6 py-3 bg-background rounded-full border shadow-sm text-sm font-medium"
              >
                {name}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/integrations">
              <Button variant="ghost">
                Все интеграции
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pet Owners Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 space-y-8">
              <Badge variant="secondary">Для владельцев животных</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Мобильное приложение для ваших клиентов
              </h2>
              <p className="text-lg text-muted-foreground">
                Владельцы питомцев могут записываться на приём, просматривать историю 
                визитов и получать напоминания о вакцинации прямо в телефоне.
              </p>
              <ul className="space-y-4">
                {[
                  "Онлайн-запись на приём в любое время",
                  "История визитов и медицинские документы",
                  "Push-уведомления о вакцинации и обработках",
                  "Чат с врачом клиники"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
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
            
            <div className="order-1 lg:order-2 relative">
              <div className="absolute -inset-4 bg-gradient-to-l from-primary/20 to-primary/5 rounded-3xl blur-2xl" />
              <img 
                src={ownerImage} 
                alt="Счастливый владелец с питомцем" 
                className="relative rounded-2xl shadow-2xl w-full aspect-[4/3] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={petsImage} 
            alt="Домашние питомцы" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary/80" />
        </div>
        
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold">
              Готовы улучшить работу вашей клиники?
            </h2>
            <p className="text-xl opacity-90">
              Запишитесь на бесплатную демонстрацию и узнайте, 
              как VetSystem может помочь вашему бизнесу
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center pt-4">
              <Link href="/demo">
                <Button size="lg" variant="secondary" className="shadow-lg">
                  Запросить демо
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-white/30 text-white bg-white/10">
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
