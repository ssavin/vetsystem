import { useState } from "react"
import { Link, useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import logoPath from "@assets/logo_1759553178604.png"

const navItems = [
  { href: "/", label: "Главная" },
  { href: "/features", label: "Возможности" },
  { href: "/pricing", label: "Цены" },
  { href: "/integrations", label: "Интеграции" },
  { href: "/demo", label: "Демо" },
]

export default function LandingHeader() {
  const [location] = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src={logoPath} alt="VetSystemAI" className="h-8 w-8 rounded" />
          <span className="text-xl font-bold text-primary">VetSystemAI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/pet-owners/login">
            <Button variant="ghost" size="sm">
              Личный кабинет
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Вход для клиник
            </Button>
          </Link>
          <Link href="/demo">
            <Button size="sm">
              Запросить демо
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          data-testid="button-mobile-menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background p-4">
          <nav className="flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  location === item.href ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <hr className="my-2" />
            <Link href="/pet-owners/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Личный кабинет
              </Button>
            </Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full">
                Вход для клиник
              </Button>
            </Link>
            <Link href="/demo" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full">
                Запросить демо
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
