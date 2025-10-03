import { Calendar, Users, FileText, Package, CreditCard, BarChart3, Stethoscope, Microscope, Settings, Shield, ClipboardList } from "lucide-react"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/contexts/AuthContext"
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
    module: null, // Доступно всем
  },
  {
    title: "Регистратура",
    url: "/registry",
    icon: Users,
    module: "owners",
  },
  {
    title: "Расписание",
    url: "/schedule",
    icon: Calendar,
    module: "appointments",
  },
  {
    title: "Мед. карты",
    url: "/medical-records",
    icon: Stethoscope,
    module: "medical_records",
  },
  {
    title: "Клинические случаи",
    url: "/clinical-cases",
    icon: ClipboardList,
    module: "medical_records",
  },
  {
    title: "Лаборатория",
    url: "/laboratory",
    icon: Microscope,
    module: "laboratory",
  },
  {
    title: "Прейскурант",
    url: "/services-inventory",
    icon: Package,
    module: "services",
  },
  {
    title: "Финансы",
    url: "/finance",
    icon: CreditCard,
    module: "finance",
  },
  {
    title: "Отчеты",
    url: "/reports",
    icon: FileText,
    module: "reports",
  },
  {
    title: "Настройки",
    url: "/settings",
    icon: Settings,
    module: "settings",
  },
  {
    title: "Админ-панель",
    url: "/superadmin",
    icon: Shield,
    module: null,
    superAdminOnly: true, // Только для суперадминистраторов
  },
]

export default function AppSidebar() {
  const [location] = useLocation()
  const { hasPermission, user } = useAuth()

  const isAdmin = user?.role === 'администратор' || user?.role === 'руководитель'
  const isSuperAdmin = user?.role === 'superadmin'

  // Filter menu items based on user permissions and role
  const visibleMenuItems = menuItems.filter((item: any) => {
    // Показываем суперадминские пункты только суперадминам
    if (item.superAdminOnly && !isSuperAdmin) return false
    // Скрываем админские пункты для обычных пользователей
    if (item.adminOnly && !isAdmin) return false
    // Скрываем пользовательские пункты для админов
    if (item.userOnly && isAdmin) return false
    // Стандартная проверка прав
    if (!item.module) return true
    return hasPermission(item.module)
  })

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
              {visibleMenuItems.map((item) => (
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