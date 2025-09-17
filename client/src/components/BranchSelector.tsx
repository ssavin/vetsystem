import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Branch = {
  id: string
  name: string
  city: string
  address: string
  status: string
}

export default function BranchSelector() {
  const { currentBranch, switchBranch } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // 🔒 SECURITY: Fetch only branches user has access to
  const { data: branches = [], isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ['/api/user/available-branches'],
  })

  const handleBranchSwitch = async (branchId: string) => {
    if (branchId === currentBranch?.id || isLoading) return

    try {
      setIsLoading(true)
      await switchBranch(branchId)
      toast({
        title: "Филиал изменен",
        description: "Вы успешно переключились на другой филиал",
      })
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось переключить филиал",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (branchesLoading || !currentBranch) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Загрузка...</span>
      </div>
    )
  }

  // If user has access to only one branch, show it as read-only
  if (branches.length <= 1) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4 text-primary" />
        <div className="text-sm">
          <div className="font-medium">{currentBranch.name}</div>
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
          data-testid="button-branch-selector"
        >
          <Building2 className="h-4 w-4 text-primary" />
          <div className="text-left">
            <div className="text-sm font-medium">{currentBranch.name}</div>
            <div className="text-xs text-muted-foreground">
              {branches.find(b => b.id === currentBranch.id)?.city || 'Филиал'}
            </div>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            className="flex flex-col items-start p-3 cursor-pointer"
            onClick={() => handleBranchSwitch(branch.id)}
            data-testid={`branch-option-${branch.id}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-medium">{branch.name}</span>
                <span className="text-sm text-muted-foreground">{branch.city}</span>
                <span className="text-xs text-muted-foreground truncate max-w-48">
                  {branch.address}
                </span>
              </div>
              {currentBranch.id === branch.id && (
                <div className="w-2 h-2 bg-primary rounded-full ml-2" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}