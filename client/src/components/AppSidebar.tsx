import { Calendar, Users, FileText, Package, CreditCard, BarChart3, Stethoscope, Microscope, Settings, Shield, Building2 } from "lucide-react"
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
]

export default function AppSidebar() {
  const [location] = useLocation()
  const { hasPermission } = useAuth()

  // Filter menu items based on user permissions
  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.module) return true // Items without module check (like dashboard) are always visible
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