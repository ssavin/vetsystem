# Инструкция по развёртыванию и обновлению VetSystem

## Первоначальная установка на сервере

### 1. Подготовка Git репозитория на Replit

На Replit выполните следующие команды в Shell:

```bash
# Инициализируем Git репозиторий (если ещё не сделано)
git init

# Добавляем все файлы
git add .

# Создаём первый коммит
git commit -m "Initial commit"

# Создайте репозиторий на GitHub и добавьте remote
git remote add origin https://github.com/YOUR_USERNAME/vetsystem.git

# Отправьте код
git push -u origin main
```

### 2. Установка на сервере vetsystemai.ru

Подключитесь к серверу по SSH:

```bash
ssh root@vetsystemai.ru
```

Скачайте файлы установки:

```bash
# Создайте временную директорию
mkdir -p /tmp/vetsystem-deploy
cd /tmp/vetsystem-deploy

# Скачайте скрипт установки
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/vetsystem/main/deploy-setup.sh
chmod +x deploy-setup.sh

# Запустите установку
sudo ./deploy-setup.sh https://github.com/YOUR_USERNAME/vetsystem.git
```

### 3. Настройка .env файла

Отредактируйте файл с настройками:

```bash
cd /var/www/vetsystem
nano .env
```

Укажите правильные параметры подключения к БД и другие настройки.

### 4. Перезапуск приложения

```bash
pm2 restart vetsystem
pm2 logs vetsystem
```

## Обновление приложения (одной командой)

### Способ 1: Обновление через Git (рекомендуется)

На Replit после внесения изменений:

```bash
git add .
git commit -m "Update: описание изменений"
git push origin main
```

На сервере:

```bash
cd /var/www/vetsystem
sudo ./upgrade.sh
```

Скрипт `upgrade.sh` автоматически:
- ✅ Создаёт резервную копию текущей версии
- ✅ Скачивает последние изменения из Git
- ✅ Обновляет зависимости
- ✅ Собирает фронтенд
- ✅ Применяет миграции БД
- ✅ Перезапускает приложение

### Способ 2: Прямая синхронизация с Replit

Если вы хотите синхронизировать напрямую с Replit без GitHub:

```bash
cd /var/www/vetsystem
./sync-from-replit.sh
sudo ./upgrade.sh
```

## Автоматические обновления (опционально)

### Настройка webhook для автоматического деплоя

1. Установите webhook listener:

```bash
npm install -g webhook
```

2. Создайте конфигурацию webhook (`/etc/webhook.conf`):

```json
[
  {
    "id": "vetsystem-deploy",
    "execute-command": "/var/www/vetsystem/upgrade.sh",
    "command-working-directory": "/var/www/vetsystem",
    "response-message": "Deploying VetSystem...",
    "trigger-rule": {
      "match": {
        "type": "payload-hash-sha1",
        "secret": "YOUR_SECRET_KEY",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature"
        }
      }
    }
  }
]
```

3. Запустите webhook как службу:

```bash
webhook -hooks /etc/webhook.conf -verbose
```

4. На GitHub добавьте webhook:
   - URL: `http://vetsystemai.ru:9000/hooks/vetsystem-deploy`
   - Secret: ваш секретный ключ
   - Events: Push events

## Откат к предыдущей версии

Если после обновления возникли проблемы:

```bash
# Посмотрите доступные бэкапы
ls -lh /var/backups/vetsystem/

# Остановите приложение
pm2 stop vetsystem

# Восстановите бэкап
cd /var/www/vetsystem
tar -xzf /var/backups/vetsystem/vetsystem_backup_YYYYMMDD_HHMMSS.tar.gz

# Перезапустите
pm2 restart vetsystem
```

## Мониторинг

### Просмотр логов

```bash
# Логи приложения
pm2 logs vetsystem

# Логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Логи PostgreSQL
tail -f /var/log/postgresql/postgresql-*.log
```

### Статус служб

```bash
# PM2 процессы
pm2 status

# Nginx
systemctl status nginx

# PostgreSQL
systemctl status postgresql
```

## Важные команды

```bash
# Перезапуск приложения
pm2 restart vetsystem

# Остановка приложения
pm2 stop vetsystem

# Запуск приложения
pm2 start vetsystem

# Просмотр использования ресурсов
pm2 monit

# Очистка логов
pm2 flush

# Применение миграций БД вручную
npm run db:push

# Сборка фронтенда вручную
npm run build
```

## Troubleshooting

### Проблема: Приложение не запускается

```bash
# Проверьте логи
pm2 logs vetsystem --lines 100

# Проверьте .env файл
cat .env

# Проверьте подключение к БД
psql -U vetsystem -d vetsystem -c "SELECT version();"
```

### Проблема: Ошибки при миграциях

```bash
# Принудительное применение миграций
npm run db:push -- --force

# Откат последней миграции (если поддерживается)
npm run db:rollback
```

### Проблема: Git конфликты при обновлении

```bash
# Сбросить локальные изменения
git reset --hard origin/main

# Или сохранить их в stash
git stash
git pull origin main
git stash pop
```

## Контакты поддержки

При возникновении проблем обращайтесь к администратору системы.
