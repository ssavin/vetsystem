# Модуль прямой печати фискальных чеков

## Поддерживаемые принтеры

- **Vikiprint 57** - фискальный принтер с USB/COM интерфейсом
- **ATOL 30F** - фискальный принтер с USB/COM интерфейсом

## Установка зависимостей

```bash
pip install -r requirements.txt
```

## Использование

### Из командной строки

```bash
python printer.py <model> <port> '<receipt_json>'
```

**Пример:**
```bash
python printer.py vikiprint COM3 '{
  "items": [
    {"name": "Консультация ветеринара", "price": 2000, "quantity": 1},
    {"name": "Витамины для кошек", "price": 800, "quantity": 2}
  ],
  "payment_method": "cash",
  "total": 3600
}'
```

### Из Python кода

```python
from printer import print_fiscal_receipt

receipt_data = {
    "items": [
        {"name": "Товар 1", "price": 100.50, "quantity": 2},
        {"name": "Товар 2", "price": 250.00, "quantity": 1}
    ],
    "payment_method": "cash",  # или "card"
    "total": 451.00
}

result = print_fiscal_receipt(
    printer_model="atol",  # или "vikiprint"
    port="COM3",
    receipt_data=receipt_data
)

if result["success"]:
    print("Чек напечатан успешно!")
else:
    print(f"Ошибка: {result['message']}")
```

## Параметры чека

| Поле | Тип | Описание |
|------|-----|----------|
| `items` | Array | Массив товаров/услуг |
| `items[].name` | String | Название позиции |
| `items[].price` | Number | Цена за единицу |
| `items[].quantity` | Number | Количество |
| `payment_method` | String | Способ оплаты: `cash` или `card` |
| `total` | Number | Общая сумма |

## Подключение принтеров

### Vikiprint 57

1. Подключите принтер к USB
2. Установите драйвер VikiDriver (опционально, для полной функциональности)
3. Определите номер COM-порта в Диспетчере устройств Windows
4. Используйте этот порт в скрипте

### ATOL 30F

1. Подключите принтер к USB
2. Установите драйвер ATOL KKT (опционально, для полной функциональности)
3. В диспетчере устройств найдите виртуальный COM-порт
4. Используйте этот порт в скрипте

## Определение COM-порта в Windows

**Диспетчер устройств:**
1. Откройте Диспетчер устройств
2. Разверните "Порты (COM и LPT)"
3. Найдите ваш принтер (например, "USB Serial Port (COM3)")
4. Запомните номер порта

**Через командную строку:**
```powershell
mode
```

## Важные замечания

⚠️ **Текущая реализация** - базовая печать текстовых чеков через COM-порт.

Для **полной фискальной функциональности** (с фискальной памятью, ОФД, электронными подписями) требуются:
- Официальные драйверы производителей
- Фискализация принтера в налоговой
- Подключение к ОФД (оператору фискальных данных)

Данный модуль подходит для:
- ✅ Печати чеков без фискальной регистрации (для внутреннего учета)
- ✅ Тестирования подключения принтеров
- ✅ Быстрого прототипирования

Для полноценной фискализации рекомендуется:
- Использовать интеграцию Dreamkas (уже реализована в VetSystem)
- Или установить полные драйверы ATOL/VikiDriver и использовать их COM API

## Кодировка текста

Принтеры используют кодировку **CP866** (DOS Cyrillic) для печати русского текста.
Скрипт автоматически конвертирует UTF-8 → CP866 перед отправкой на принтер.

## Отладка

### Проверка подключения

```python
import serial

# Проверка доступности порта
try:
    ser = serial.Serial('COM3', 115200, timeout=1)
    print(f"✓ Порт COM3 доступен")
    print(f"  Скорость: {ser.baudrate}")
    ser.close()
except serial.SerialException as e:
    print(f"✗ Ошибка: {e}")
```

### Список доступных COM-портов

```python
import serial.tools.list_ports

ports = serial.tools.list_ports.comports()
for port in ports:
    print(f"{port.device} - {port.description}")
```

## Структура ответа

```json
{
  "success": true,
  "message": "Чек успешно напечатан",
  "printer": "ATOL 30F"
}
```

Или в случае ошибки:

```json
{
  "success": false,
  "error": "Не удалось подключиться к принтеру на COM3",
  "message": "Ошибка печати на ATOL 30F: ..."
}
```

## Лицензия

MIT
