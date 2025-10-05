import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

type Tenant = {
  id: string
  name: string
  slug: string
  status: string
}

export default function TenantSelector() {
  const { currentTenant, switchTenant, user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Only show for superadmin
  if (!user?.isSuperAdmin) {
    return null
  }

  // Fetch all active tenants (superadmin only)
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants'],
  })

  const handleTenantSwitch = async (tenantId: string) => {
    if (tenantId === currentTenant?.id || isLoading) return

    try {
      setIsLoading(true)
      await switchTenant(tenantId)
      toast({
        title: "Клиника изменена",
        description: "Вы успешно переключились на другую клинику",
      })
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось переключить клинику",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (tenantsLoading || !currentTenant) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Building className="h-4 w-4" />
        <span className="text-sm">Загрузка...</span>
      </div>
    )
  }

  // If only one tenant, show it as read-only
  if (tenants.length <= 1) {
    return (
      <div className="flex items-center space-x-2">
        <Building className="h-4 w-4 text-primary" />
        <div className="text-sm">
          <div className="font-medium">{currentTenant.name}</div>
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-auto p-2 gap-2 hover-elevate"
          disabled={isLoading}
          data-testid="button-tenant-selector"
        >
          <Building className="h-4 w-4 text-primary" />
          <div className="text-left">
            <div className="text-sm font-medium">{currentTenant.name}</div>
            <div className="text-xs text-muted-foreground">Клиника</div>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            className="flex flex-col items-start p-3 cursor-pointer"
            onClick={() => handleTenantSwitch(tenant.id)}
            data-testid={`tenant-option-${tenant.id}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-medium">{tenant.name}</span>
                <span className="text-xs text-muted-foreground">{tenant.slug}</span>
              </div>
              {currentTenant.id === tenant.id && (
                <div className="w-2 h-2 bg-primary rounded-full ml-2" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
