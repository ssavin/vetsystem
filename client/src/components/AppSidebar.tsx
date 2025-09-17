import { Calendar, Users, FileText, Package, CreditCard, BarChart3, Stethoscope, Microscope, Settings, Shield } from "lucide-react"
import { Link, useLocation } from "wouter"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const menuItems = [
  {
    title: "Начальная страница",
    url: "/",
    icon: BarChart3,
  },
  {
    title: "Регистратура",
    url: "/registry",
    icon: Users,
  },
  {
    title: "Расписание",
    url: "/schedule",
    icon: Calendar,
  },
  {
    title: "Мед. карты",
    url: "/medical-records",
    icon: Stethoscope,
  },
  {
    title: "Лаборатория",
    url: "/laboratory",
    icon: Microscope,
  },
  {
    title: "Продажи и Закупки",
    url: "/services-inventory",
    icon: Package,
  },
  {
    title: "Финансы",
    url: "/finance",
    icon: CreditCard,
  },
  {
    title: "Отчеты",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "Настройки",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Пользователи",
    url: "/users",
    icon: Shield,
  },
]

export default function AppSidebar() {
  const [location] = useLocation()

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg text-sidebar-primary">VetSystem</h2>
          <p className="text-sm text-muted-foreground">Ветеринарная клиника</p>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Модули системы</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.url.slice(1) || 'dashboard'}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}