import { Calendar, Users, FileText, Package, CreditCard, BarChart3, Stethoscope, Microscope, Settings, Shield, ClipboardList } from "lucide-react"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/contexts/AuthContext"
import { useTranslation } from "react-i18next"
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
import logoPath from "@assets/logo_1759553178604.png"

const getMenuItems = (t: any) => [
  {
    titleKey: "menu.dashboard",
    url: "/",
    icon: BarChart3,
    module: null,
  },
  {
    titleKey: "menu.registry",
    url: "/registry",
    icon: Users,
    module: "owners",
  },
  {
    titleKey: "menu.schedule",
    url: "/schedule",
    icon: Calendar,
    module: "appointments",
  },
  {
    titleKey: "menu.medicalRecords",
    url: "/medical-records",
    icon: Stethoscope,
    module: "medical_records",
  },
  {
    titleKey: "menu.clinicalCases",
    url: "/clinical-cases",
    icon: ClipboardList,
    module: "medical_records",
  },
  {
    titleKey: "menu.laboratory",
    url: "/laboratory",
    icon: Microscope,
    module: "laboratory",
  },
  {
    titleKey: "menu.servicesInventory",
    url: "/services-inventory",
    icon: Package,
    module: "services",
  },
  {
    titleKey: "menu.finance",
    url: "/finance",
    icon: CreditCard,
    module: "finance",
  },
  {
    titleKey: "menu.reports",
    url: "/reports",
    icon: FileText,
    module: "reports",
    managerOnly: true,
  },
  {
    titleKey: "menu.settings",
    url: "/settings",
    icon: Settings,
    module: "settings",
    managerOnly: true,
  },
  {
    titleKey: "menu.adminPanel",
    url: "/superadmin",
    icon: Shield,
    module: null,
    superAdminOnly: true,
  },
]

export default function AppSidebar() {
  const [location] = useLocation()
  const { hasPermission, user } = useAuth()
  const { t } = useTranslation('navigation')

  const isAdmin = user?.role === 'администратор' || user?.role === 'руководитель'
  const isManager = user?.role === 'руководитель'
  const isSuperAdmin = user?.role === 'superadmin'

  const menuItems = getMenuItems(t)

  const visibleMenuItems = menuItems.filter((item: any) => {
    if (item.superAdminOnly && !isSuperAdmin) return false
    if (item.managerOnly && !isManager && !isSuperAdmin) return false
    if (item.adminOnly && !isAdmin) return false
    if (item.userOnly && isAdmin) return false
    if (!item.module) return true
    if (isSuperAdmin) return true
    return hasPermission(item.module)
  })

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 border-b flex items-center gap-3">
          <img src={logoPath} alt="VetSystem" className="w-12 h-12 rounded-md" />
          <div>
            <h2 className="font-semibold text-lg text-sidebar-primary">{t('appTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('appSubtitle')}</p>
          </div>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>{t('moduleTitle', 'Модули системы')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.url.slice(1) || 'dashboard'}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{t(item.titleKey)}</span>
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