# VetSystem Mobile App

Мобильное приложение для системы управления ветеринарной клиникой VetSystem. Позволяет владельцам питомцев записываться на прием, просматривать историю болезни и получать уведомления.

## Технологии

- **React Native** - кроссплатформенная разработка
- **Expo** - инструменты и сервисы для React Native
- **React Navigation** - навигация между экранами
- **React Native Paper** - Material Design компоненты
- **TanStack Query** - управление серверным состоянием
- **TypeScript** - статическая типизация

## Функции

### Реализовано:
- ✅ SMS авторизация (код из СМС)
- ✅ Просмотр профиля владельца
- ✅ Список питомцев с поиском
- ✅ Детальная информация о питомце
- ✅ История болезни питомца
- ✅ Запись на прием (пошаговый процесс)
- ✅ Push-уведомления (инфраструктура)

### Планируется:
- ⏳ Электронная очередь
- ⏳ Чат с клиникой
- ⏳ Онлайн оплата
- ⏳ Напоминания о приемах

## Установка

1. **Установите зависимости:**
   ```bash
   cd mobile-app
   npm install
   ```

2. **Настройте API URL:**
   - Для разработки используется `http://localhost:5000/api`
   - Для production измените URL в `src/services/api.ts`

## Запуск

### Development режим

```bash
npm start
```

Это откроет Expo Dev Tools в браузере. Далее:

- **Android**: Нажмите `a` для запуска в Android эмуляторе или отсканируйте QR-код в приложении Expo Go
- **iOS**: Нажмите `i` для запуска в iOS симуляторе или отсканируйте QR-код в приложении Expo Go
- **Web**: Нажмите `w` для запуска веб-версии

### Запуск на физическом устройстве

1. Установите приложение **Expo Go** на свой телефон:
   - [Android - Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Убедитесь, что телефон и компьютер в одной Wi-Fi сети

3. Запустите `npm start` и отсканируйте QR-код

## Структура проекта

```
mobile-app/
├── src/
│   ├── screens/          # Экраны приложения
│   │   ├── AuthScreen.tsx       # Авторизация
│   │   ├── HomeScreen.tsx       # Главный экран
│   │   ├── PetsScreen.tsx       # Список питомцев
│   │   ├── PetDetailScreen.tsx  # Детали питомца
│   │   └── BookingScreen.tsx    # Запись на прием
│   ├── services/         # API и сервисы
│   │   └── api.ts              # Клиент API
│   ├── types/            # TypeScript типы
│   │   └── index.ts
│   ├── theme/            # Тема и стили
│   │   └── index.ts
│   ├── components/       # Переиспользуемые компоненты
│   ├── navigation/       # Настройки навигации
│   └── hooks/            # Кастомные хуки
├── App.tsx               # Точка входа
├── app.json              # Конфигурация Expo
└── package.json          # Зависимости

## API Интеграция

Приложение взаимодействует с backend через следующие эндпоинты:

### Авторизация
- `POST /api/mobile/auth/send-code` - Отправка SMS кода
- `POST /api/mobile/auth/verify-code` - Проверка кода и вход

### Профиль
- `GET /api/mobile/me/profile` - Данные владельца с питомцами

### Записи
- `GET /api/mobile/appointments/slots` - Доступные слоты
- `POST /api/mobile/appointments` - Создание записи

### История
- `GET /api/mobile/pets/:petId/history` - История болезни

### Push-уведомления
- `POST /api/mobile/me/register-push-token` - Регистрация токена

## Конфигурация

### Настройка push-уведомлений

1. Получите учетные данные для Firebase (Android) и APNs (iOS)
2. Добавьте их в `app.json` под ключом `expo.plugins`
3. Зарегистрируйте токен при первом запуске

### Настройка темы

Тема находится в `src/theme/index.ts`:
- Поддерживает светлый и темный режимы
- Использует медицинскую цветовую палитру
- Автоматически адаптируется к системным настройкам

## Сборка для продакшена

### Android (APK/AAB)

```bash
expo build:android
```

### iOS (IPA)

```bash
expo build:ios
```

### Используя EAS Build (рекомендуется)

```bash
# Установка EAS CLI
npm install -g eas-cli

# Конфигурация проекта
eas build:configure

# Сборка
eas build --platform android
eas build --platform ios
```

## Безопасность

- Все API запросы защищены JWT токенами
- Токен автоматически добавляется к каждому запросу
- При истечении токена пользователь перенаправляется на экран авторизации
- Tenant isolation обеспечивается на уровне backend через middleware

## Поддержка

Для вопросов и поддержки обращайтесь к команде разработки VetSystem.
