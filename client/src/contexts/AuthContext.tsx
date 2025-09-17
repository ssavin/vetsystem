import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '@shared/schema'

import { ROLE_PERMISSIONS } from '../shared/permissions';

interface AuthContextType {
  user: User | null
  currentBranch: { id: string; name: string } | null
  login: (username: string, password: string, branchId: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  hasPermission: (module: string) => boolean
  isLoading: boolean
}

// HMR-stable singleton context
const globalAny = globalThis as any;
const AuthContext: React.Context<AuthContextType | undefined> = (globalAny.__auth_ctx ||= createContext<AuthContextType | undefined>(undefined));

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [currentBranch, setCurrentBranch] = useState<{ id: string; name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const hasPermission = (module: string): boolean => {
    if (!user) return false
    
    const userRole = user.role as keyof typeof ROLE_PERMISSIONS
    const allowedModules = ROLE_PERMISSIONS[userRole] || []
    
    // Руководитель имеет доступ ко всему
    if (userRole === 'руководитель') return true
    
    return allowedModules.some(allowedModule => allowedModule === module)
  }

  const login = async (username: string, password: string, branchId: string): Promise<void> => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, branchId }),
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Important: send cookies
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка авторизации')
      }

      const data = await response.json()
      setUser(data.user)
      setCurrentBranch(data.currentBranch || { id: branchId, name: 'Unknown Branch' })
      
      // Remove localStorage dependency - JWT tokens are now in httpOnly cookies
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // Send cookies for logout
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setCurrentBranch(null)
    }
  }

  // Проверяем аутентификацию через защищенный роут при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include' // Send httpOnly cookies
        })
        
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setCurrentBranch(data.currentBranch || null)
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        currentBranch,
        login,
        logout,
        isAuthenticated: !!user,
        hasPermission,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}