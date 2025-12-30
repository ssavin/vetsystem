import { LogOut, User } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import ThemeToggle from "@/components/ThemeToggle"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import BranchSelector from "@/components/BranchSelector"
import TenantSelector from "@/components/TenantSelector"

export default function TopHeader() {
  const { user, logout } = useAuth()

  return (
    <div className="bg-card text-card-foreground px-4 py-1.5 flex items-center justify-between text-sm border-b">
      <div className="flex items-center gap-4">
        <span className="font-semibold text-primary">VetSystem 2025</span>
        <span className="text-muted-foreground text-xs hidden md:block">Ветеринарная информационная система</span>
      </div>
      
      <div className="flex items-center gap-3">
        <TenantSelector />
        <BranchSelector />
        
        <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{user?.fullName}</span>
          <span className="text-muted-foreground text-xs">({user?.role})</span>
        </div>
        
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-8 w-8"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
