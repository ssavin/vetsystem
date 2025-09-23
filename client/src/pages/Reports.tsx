import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  BarChart3, 
  Users, 
  Calendar, 
  Banknote, 
  Package, 
  TrendingUp, 
  Download,
  Filter,
  CalendarRange
} from "lucide-react"

// TODO: Remove mock data when connecting to real backend
const reportCategories = [
  {
    title: "Отчеты по записям",
    icon: Calendar,
    reports: [
      { name: "Загруженность врачей", description: "Статистика записей по врачам за период", color: "blue" },
      { name: "Загруженность кабинетов", description: "Использование кабинетов и оборудования", color: "green" },
      { name: "Статистика неявок", description: "Процент неявок и отменных записей", color: "red" },
      { name: "Типы приемов", description: "Распределение по типам приемов", color: "purple" }
    ]
  },
  {
    title: "Отчеты по клиентам",
    icon: Users,
    reports: [
      { name: "Новые клиенты", description: "Статистика привлечения новых клиентов", color: "blue" },
      { name: "ABC-анализ клиентов", description: "Сегментация клиентов по доходности", color: "green" },
      { name: "Активность клиентов", description: "Частота обращений и повторные визиты", color: "orange" },
      { name: "География клиентов", description: "Распределение клиентов по районам", color: "purple" }
    ]
  },
  {
    title: "Отчеты по пациентам",
    icon: BarChart3,
    reports: [
      { name: "Статистика по видам", description: "Распределение пациентов по видам животных", color: "blue" },
      { name: "Статистика по породам", description: "Популярные породы в клинике", color: "green" },
      { name: "Возрастной анализ", description: "Распределение пациентов по возрасту", color: "orange" },
      { name: "Диагнозы", description: "Статистика по наиболее частым диагнозам", color: "red" }
    ]
  },
  {
    title: "Финансовые отчеты",
    icon: Banknote,
    reports: [
      { name: "Выручка по услугам", description: "Доходность различных услуг", color: "green" },
      { name: "Выручка по врачам", description: "Производительность врачей", color: "blue" },
      { name: "Сравнительный анализ", description: "Сравнение доходов по периодам", color: "purple" },
      { name: "Структура доходов", description: "Услуги vs товары", color: "orange" }
    ]
  },
  {
    title: "Отчеты по складу",
    icon: Package,
    reports: [
      { name: "Оборачиваемость товаров", description: "Скорость продажи товаров", color: "blue" },
      { name: "ABC-анализ товаров", description: "Классификация товаров по прибыльности", color: "green" },
      { name: "Товары с низким остатком", description: "Товары требующие закупки", color: "red" },
      { name: "Движение товаров", description: "Приход и расход за период", color: "purple" }
    ]
  }
]

const quickStats = [
  { label: "Отчетов сформировано", value: 127, change: "+12%", color: "blue" },
  { label: "За этот месяц", value: 23, change: "+8%", color: "green" },
  { label: "Популярный отчет", value: "Выручка", change: "32 раза", color: "purple" },
  { label: "Время формирования", value: "2.3 сек", change: "-0.5 сек", color: "orange" }
]

export default function Reports() {
  const generateReport = (reportName: string) => {
    console.log(`Generating report: ${reportName}`)
  }

  const getColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'green': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'red': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'purple': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'orange': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-reports-title">Отчеты и аналитика</h1>
          <p className="text-muted-foreground">Формирование отчетов для анализа деятельности клиники</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-date-filter">
            <CalendarRange className="h-4 w-4 mr-2" />
            Период
          </Button>
          <Button variant="outline" data-testid="button-export-reports">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Quick Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-2xl font-bold" data-testid={`text-stat-${index}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <Badge className={getColorClass(stat.color)} variant="secondary">
                  {stat.change}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Categories */}
      <div className="space-y-6">
        {reportCategories.map((category, categoryIndex) => {
          const IconComponent = category.icon
          return (
            <Card key={categoryIndex}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5" />
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {category.reports.map((report, reportIndex) => (
                    <div 
                      key={reportIndex}
                      className="p-4 border rounded-lg hover-elevate cursor-pointer space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{report.name}</h4>
                          <Badge className={getColorClass(report.color)} variant="secondary" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {report.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => generateReport(report.name)}
                          data-testid={`button-generate-${reportIndex}-${categoryIndex}`}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Сформировать
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-schedule-${reportIndex}-${categoryIndex}`}
                        >
                          <Calendar className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Custom Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Настраиваемые отчеты
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-4 p-6 border rounded-lg hover-elevate cursor-pointer">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium">Конструктор отчетов</h3>
                <p className="text-sm text-muted-foreground">Создайте собственный отчет</p>
              </div>
              <Button data-testid="button-report-builder">
                Создать отчет
              </Button>
            </div>

            <div className="text-center space-y-4 p-6 border rounded-lg hover-elevate cursor-pointer">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium">Начальная страница аналитики</h3>
                <p className="text-sm text-muted-foreground">Интерактивная панель</p>
              </div>
              <Button variant="outline" data-testid="button-analytics-dashboard">
                Открыть начальную страницу
              </Button>
            </div>

            <div className="text-center space-y-4 p-6 border rounded-lg hover-elevate cursor-pointer">
              <Download className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium">Архив отчетов</h3>
                <p className="text-sm text-muted-foreground">Ранее сформированные отчеты</p>
              </div>
              <Button variant="outline" data-testid="button-reports-archive">
                Архив
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}