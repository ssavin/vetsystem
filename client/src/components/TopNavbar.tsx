import { Calendar, Users, FileText, Package, CreditCard, BarChart3, Stethoscope, Microscope, Settings, Shield, ClipboardList, ListOrdered, Bed } from "lucide-react"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/contexts/AuthContext"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import logoPath from "@assets/logo_1759553178604.png"

const getMenuItems = (t: any) => [
  {
    titleKey: "menu.registry",
    title: "Регистратура",
    url: "/registry",
    icon: Users,
    module: "owners",
  },
  {
    titleKey: "menu.schedule",
    title: "Календарь",
    url: "/schedule",
    icon: Calendar,
    module: "appointments",
  },
  {
    titleKey: "menu.queue",
    title: "Очередь",
    url: "/queue",
    icon: ListOrdered,
    module: null,
  },
  {
    titleKey: "menu.medicalRecords",
    title: "Медкарта",
    url: "/medical-records",
    icon: Stethoscope,
    module: "medical_records",
  },
  {
    titleKey: "menu.clinicalCases",
    title: "Клин. случаи",
    url: "/clinical-cases",
    icon: ClipboardList,
    module: "medical_records",
  },
  {
    titleKey: "menu.hospital",
    title: "Стационар",
    url: "/hospital",
    icon: Bed,
    module: null,
  },
  {
    titleKey: "menu.laboratory",
    title: "Лаборатория",
    url: "/laboratory",
    icon: Microscope,
    module: "laboratory",
  },
  {
    titleKey: "menu.servicesInventory",
    title: "Номенклатура",
    url: "/services-inventory",
    icon: Package,
    module: "services",
  },
  {
    titleKey: "menu.finance",
    title: "Финансы",
    url: "/finance",
    icon: CreditCard,
    module: "finance",
  },
  {
    titleKey: "menu.reports",
    title: "Отчёты",
    url: "/reports",
    icon: FileText,
    module: "reports",
    managerOnly: true,
  },
  {
    titleKey: "menu.settings",
    title: "Настройки",
    url: "/settings",
    icon: Settings,
    module: "settings",
    managerOnly: true,
  },
  {
    titleKey: "menu.adminPanel",
    title: "Суперадмин",
    url: "/superadmin",
    icon: Shield,
    module: null,
    superAdminOnly: true,
  },
]

export default function TopNavbar() {
  const [location] = useLocation()
  const { hasPermission, user } = useAuth()
  const { t } = useTranslation('navigation')

  const isAdmin = user?.role === 'администратор' || user?.role === 'admin' || user?.role === 'руководитель'
  const isManager = user?.role === 'руководитель' || user?.role === 'администратор' || user?.role === 'admin'
  const isSuperAdmin = user?.role === 'superadmin'

  const menuItems = getMenuItems(t)

  const visibleMenuItems = menuItems.filter((item: any) => {
    if (isSuperAdmin) {
      if (item.superAdminOnly) return true
      if (item.url === "/") return true
      return false
    }
    
    if (item.superAdminOnly) return false
    if (item.managerOnly && !isManager) return false
    if (item.adminOnly && !isAdmin) return false
    if (item.userOnly && isAdmin) return false
    if (!item.module) return true
    return hasPermission(item.module)
  })

  return (
    <nav className="bg-primary shadow-md border-b border-primary-foreground/10">
      <div className="flex items-center h-14 px-2">
        <Link href="/" className="flex items-center gap-2 px-3 mr-2">
          <img src={logoPath} alt="VetSystem" className="w-8 h-8 rounded" />
          <span className="text-primary-foreground font-bold text-lg hidden lg:block">VetSystem</span>
        </Link>
        
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {visibleMenuItems.map((item) => {
            const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url))
            return (
              <Tooltip key={item.url}>
                <TooltipTrigger asChild>
                  <Link 
                    href={item.url}
                    data-testid={`nav-${item.url.slice(1) || 'dashboard'}`}
                    className={cn(
                      "flex flex-col items-center justify-center px-3 py-1.5 rounded-md transition-all min-w-[70px]",
                      "hover:bg-primary-foreground/20",
                      isActive 
                        ? "bg-primary-foreground/25 shadow-inner" 
                        : "text-primary-foreground/90"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 mb-0.5",
                      isActive ? "text-primary-foreground" : "text-primary-foreground/80"
                    )} />
                    <span className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      isActive ? "text-primary-foreground" : "text-primary-foreground/80"
                    )}>
                      {item.title}
                    </span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {t(item.titleKey)}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
