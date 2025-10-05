# План миграции медицинских данных из Vetais в VetSystem

## Обзор данных в Vetais

### Основные медицинские таблицы:
1. **medical_exams** - 155,817 записей (основные осмотры/визиты)
2. **medical_plan_item** - 347,932 записей (назначения, лечение, диагностика)
3. **medical_patient_symptoms** - 35,449 записей (симптомы)
4. **medical_patient_conclusion** - заключения врача
5. **medical_media_data** - 16,766 файлов (рентген, УЗИ, документы)
6. **medical_hospitalization** - госпитализация
7. **file_patients** - 87,093 пациентов (для связи)

## Маппинг полей: Vetais → VetSystem

### 1. Медицинские осмотры: medical_exams → medical_records

| Vetais (medical_exams) | VetSystem (medical_records) | Примечания |
|------------------------|----------------------------|-----------|
| id | vetais_id (новое поле) | Отслеживание источника |
| id_patient | patient_id | Через маппинг vetais_id пациентов |
| exam_date | visit_date | Дата визита |
| diagnosis | diagnosis | Диагноз |
| anamnesis | complaints | Жалобы/анамнез |
| temperature | temperature | Температура |
| weight | weight | Вес |
| findings | notes | Находки/заметки |
| status | status | Статус записи |
| id_doctor | doctor_id | Через маппинг users.vetais_id |
| id_clinic, id_department | branch_id | Через маппинг vetais_clinic_id |
| exam_type | visit_type | Тип визита |
| plan_therapy | treatment (JSON) | План лечения |
| created_at, updated_at | createdAt, updatedAt | Временные метки |

### 2. Назначения и лечение: medical_plan_item → medications / treatment

| Vetais (medical_plan_item) | VetSystem | Примечания |
|----------------------------|-----------|-----------|
| id | - | Не хранится |
| id_exam | Связь через medical_record | Через vetais_id осмотра |
| id_pacient | patient_id | Дополнительная проверка |
| plan_item_desc | name / description | Описание назначения |
| plan_item_price | - | Цена (если нужна) |
| plan_item_date | createdAt | Дата назначения |
| plan_item_type | Определяет целевую таблицу | diagnosis, therapy, vaccine, lab, etc |

**Типы plan_item_type:**
- `therapy` / `prescription` → medications (лекарства)
- `diagnosis` → часть medical_records.diagnosis
- `vaccine` → vaccinations (если есть)
- `lab` / `laboratory` → lab_orders
- `other` → treatment JSON в medical_records

### 3. Симптомы: medical_patient_symptoms → часть medical_records

| Vetais | VetSystem | Примечания |
|--------|-----------|-----------|
| id_exam | medical_record через vetais_id | |
| id_symptom | - | ID симптома из справочника |
| symptom_desc | Добавить в complaints | Объединить с жалобами |

### 4. Медиа файлы: medical_media_data → attachments / patient_files

| Vetais (medical_media_data) | VetSystem (attachments / patient_files) | Примечания |
|-----------------------------|----------------------------------------|-----------|
| id | vetais_id | |
| id_patient | patient_id | Через маппинг |
| id_exam | entity_id (если exam) | Связь с осмотром |
| path | storage_path | Путь к файлу |
| filename | filename | Имя файла |
| file_orig | original_filename | Оригинальное имя |
| media_type | file_type | Тип: xray, ultrasound, document |
| media_date | created_at | Дата создания |
| selected | - | Избранное (можно пропустить) |

### 5. Госпитализация: medical_hospitalization → clinical_cases + clinical_encounters

| Vetais | VetSystem | Примечания |
|--------|-----------|-----------|
| id | vetais_id в clinical_cases | |
| patient_id | patient_id | |
| admission_date | start_date в clinical_cases | |
| discharge_date | end_date в clinical_cases | |
| reason | chief_complaint | |
| conclusion | diagnosis | |
| status | status | |

## Стратегия миграции

### Этап 1: Подготовка схемы
- ✅ Добавить поле `vetais_id` в таблицы:
  - medical_records
  - medications
  - attachments
  - patient_files
  - clinical_cases
  - clinical_encounters
- ✅ Создать индексы на vetais_id для быстрого поиска

### Этап 2: Миграция основных данных
1. **Медицинские осмотры** (medical_exams → medical_records)
   - Мигрировать по пациентам
   - Использовать batching (500-1000 записей)
   - Сохранить vetais_id для идемпотентности
   - Маппинг врачей через users.vetais_id
   - Маппинг филиалов через branches.vetais_clinic_id

2. **Назначения и лекарства** (medical_plan_item)
   - Фильтровать по plan_item_type
   - therapy/prescription → medications
   - diagnosis → обновить medical_records.diagnosis
   - other → treatment JSON

3. **Симптомы** (medical_patient_symptoms)
   - Добавить к complaints в medical_records
   - Группировать по exam_id

### Этап 3: Миграция файлов
1. **Медиа файлы** (medical_media_data)
   - Скопировать файлы в storage
   - Создать записи в attachments/patient_files
   - Сохранить metadata
   - Привязать к пациентам/осмотрам

### Этап 4: Проверка и валидация
- Сравнить количество записей
- Проверить целостность связей
- Валидировать обязательные поля
- Создать отчет о миграции

## Технические детали

### Порядок выполнения (с учетом FK):
1. Убедиться что пациенты, врачи, филиалы уже мигрированы
2. Мигрировать medical_records (основа)
3. Мигрировать medications (зависит от medical_records)
4. Мигрировать clinical_cases
5. Мигрировать clinical_encounters
6. Мигрировать attachments/patient_files

### Обработка ошибок:
- Пропускать записи с отсутствующими пациентами
- Логировать все ошибки
- Поддержка dry-run режима
- Возможность возобновления с последней успешной позиции

### Идемпотентность:
- Проверка vetais_id перед вставкой
- UPDATE вместо INSERT при повторном запуске
- Транзакционная обработка батчей

## Следующие шаги

1. ✅ Расширить схему VetSystem (добавить vetais_id)
2. ⏳ Создать скрипт миграции medical_records
3. ⏳ Создать скрипт миграции medications
4. ⏳ Создать скрипт миграции файлов
5. ⏳ Протестировать на малой выборке
6. ⏳ Выполнить полную миграцию
