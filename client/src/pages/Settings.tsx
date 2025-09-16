import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Printer,
  Mail,
  Phone,
  Save
} from "lucide-react"
import { useState } from "react"

export default function Settings() {
  const [clinicName, setClinicName] = useState("Ветеринарная клиника \"Здоровый питомец\"")
  const [clinicAddress, setClinicAddress] = useState("г. Москва, ул. Примерная, д. 123")
  const [clinicPhone, setClinicPhone] = useState("+7 (499) 123-45-67")
  const [clinicEmail, setClinicEmail] = useState("info@vetclinic.ru")
  
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    appointments: true,
    lowStock: true,
    overduePayments: true
  })

  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    dataRetention: 365,
    sessionTimeout: 30,
    twoFactorAuth: false
  })

  const saveSettings = () => {
    console.log("Saving settings:", { 
      clinic: { clinicName, clinicAddress, clinicPhone, clinicEmail },
      notifications,
      system: systemSettings
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-settings-title">Настройки системы</h1>
        <p className="text-muted-foreground">Конфигурация и управление параметрами VetSystem</p>
      </div>

      {/* Clinic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Информация о клинике
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Название клиники</Label>
              <Input
                id="clinicName"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                data-testid="input-clinic-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicAddress">Адрес</Label>
              <Input
                id="clinicAddress"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                data-testid="input-clinic-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicPhone">Телефон</Label>
              <Input
                id="clinicPhone"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                data-testid="input-clinic-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicEmail">Email</Label>
              <Input
                id="clinicEmail"
                type="email"
                value={clinicEmail}
                onChange={(e) => setClinicEmail(e.target.value)}
                data-testid="input-clinic-email"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email уведомления</Label>
                <p className="text-sm text-muted-foreground">
                  Получать уведомления на электронную почту
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, email: checked }))
                }
                data-testid="switch-email-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS уведомления</Label>
                <p className="text-sm text-muted-foreground">
                  Отправлять SMS клиентам
                </p>
              </div>
              <Switch
                checked={notifications.sms}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, sms: checked }))
                }
                data-testid="switch-sms-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Напоминания о записях</Label>
                <p className="text-sm text-muted-foreground">
                  Автоматические напоминания клиентам
                </p>
              </div>
              <Switch
                checked={notifications.appointments}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, appointments: checked }))
                }
                data-testid="switch-appointment-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Низкие остатки на складе</Label>
                <p className="text-sm text-muted-foreground">
                  Уведомления о товарах с низким остатком
                </p>
              </div>
              <Switch
                checked={notifications.lowStock}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, lowStock: checked }))
                }
                data-testid="switch-low-stock-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Просроченные платежи</Label>
                <p className="text-sm text-muted-foreground">
                  Уведомления о просроченных счетах
                </p>
              </div>
              <Switch
                checked={notifications.overduePayments}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, overduePayments: checked }))
                }
                data-testid="switch-overdue-notifications"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Системные настройки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Автоматическое резервное копирование</Label>
                  <p className="text-sm text-muted-foreground">
                    Ежедневное создание резервных копий
                  </p>
                </div>
                <Switch
                  checked={systemSettings.autoBackup}
                  onCheckedChange={(checked) => 
                    setSystemSettings(prev => ({ ...prev, autoBackup: checked }))
                  }
                  data-testid="switch-auto-backup"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataRetention">Хранение данных (дни)</Label>
                <Input
                  id="dataRetention"
                  type="number"
                  value={systemSettings.dataRetention}
                  onChange={(e) => 
                    setSystemSettings(prev => ({ 
                      ...prev, 
                      dataRetention: parseInt(e.target.value) || 365 
                    }))
                  }
                  data-testid="input-data-retention"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Двухфакторная аутентификация</Label>
                  <p className="text-sm text-muted-foreground">
                    Дополнительная защита входа в систему
                  </p>
                </div>
                <Switch
                  checked={systemSettings.twoFactorAuth}
                  onCheckedChange={(checked) => 
                    setSystemSettings(prev => ({ ...prev, twoFactorAuth: checked }))
                  }
                  data-testid="switch-two-factor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Тайм-аут сессии (минуты)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={systemSettings.sessionTimeout}
                  onChange={(e) => 
                    setSystemSettings(prev => ({ 
                      ...prev, 
                      sessionTimeout: parseInt(e.target.value) || 30 
                    }))
                  }
                  data-testid="input-session-timeout"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-16 flex-col gap-2" data-testid="button-database-backup">
              <Database className="h-5 w-5" />
              <span>Резервная копия</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2" data-testid="button-print-settings">
              <Printer className="h-5 w-5" />
              <span>Настройки печати</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2" data-testid="button-email-config">
              <Mail className="h-5 w-5" />
              <span>Настройки email</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2" data-testid="button-sms-config">
              <Phone className="h-5 w-5" />
              <span>Настройки SMS</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} data-testid="button-save-settings">
          <Save className="h-4 w-4 mr-2" />
          Сохранить настройки
        </Button>
      </div>
    </div>
  )
}