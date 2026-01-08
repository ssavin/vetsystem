import { Link } from "wouter"
import logoPath from "@assets/logo_1759553178604.png"
import { Mail, Phone, MapPin } from "lucide-react"

const footerLinks = {
  product: [
    { href: "/features", label: "Возможности" },
    { href: "/pricing", label: "Цены" },
    { href: "/integrations", label: "Интеграции" },
    { href: "/demo", label: "Запросить демо" },
  ],
  support: [
    { href: "/support/docs", label: "Документация" },
    { href: "/support/faq", label: "FAQ" },
    { href: "/support/contact", label: "Связаться с нами" },
  ],
  legal: [
    { href: "/privacy", label: "Политика конфиденциальности" },
    { href: "/terms", label: "Пользовательское соглашение" },
  ],
}

export default function LandingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <img src={logoPath} alt="VetSystemAI" className="h-8 w-8 rounded" />
              <span className="text-xl font-bold text-primary">VetSystemAI</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Умная платформа для управления ветеринарными клиниками. 
              Автоматизация, аналитика, мобильное приложение.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>8-800-XXX-XX-XX</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>info@vetsystemai.ru</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Москва, Россия</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Продукт</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Поддержка</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Правовая информация</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} VetSystemAI. Все права защищены.</p>
        </div>
      </div>
    </footer>
  )
}
