import sys
import logging
from datetime import datetime, time, timedelta
from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                            QPushButton, QTableWidget, QTableWidgetItem,
                            QCalendarWidget, QComboBox, QGroupBox, QMessageBox,
                            QHeaderView, QTimeEdit, QLineEdit, QDialog, QDialogButtonBox,
                            QFormLayout, QTextEdit, QTabWidget, QDateEdit, QSpinBox,
                            QCheckBox, QListWidget, QSplitter, QToolBar, QStatusBar,
                            QScrollArea, QGridLayout, QFrame, QSizePolicy, QStackedWidget)
from PyQt6.QtCore import Qt, QDate, QTime
from PyQt6.QtGui import QFont, QColor, QIcon, QBrush

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Создаем классы перечислений для статусов и типов
class AppointmentStatus:
    PLANNED = "запланирован"
    CONFIRMED = "подтвержден"
    WAITING = "клиент ожидает"
    IN_PROGRESS = "идет прием"
    COMPLETED = "прием завершен"
    NO_SHOW = "неявка"
    CANCELLED = "отменен"

class AppointmentType:
    PRIMARY = "первичный"
    REPEAT = "повторный"
    CONSULTATION = "консультация"
    PROCEDURE = "процедура"
    OPERATION = "операция"
    VACCINATION = "вакцинация"
    DIAGNOSTICS = "диагностика"
    THERAPY = "терапия"
    GROOMING = "груминг"
    STERILIZATION = "стерилизация"
    DENTISTRY = "стоматология"
    ULTRASOUND = "УЗИ"
    XRAY = "рентген"

class RepeatPattern:
    NONE = "без повторения"
    DAILY = "ежедневно"
    WEEKLY = "еженедельно"
    MONTHLY = "ежемесячно"

class ViewMode:
    DAY = "день"
    WEEK = "неделя"
    MONTH = "месяц"
    LIST = "список"

# Заглушки для сервисов
class ScheduleService:
    def __init__(self):
        logger.debug("✅ ScheduleService инициализирован (заглушка)")
    
    def get_appointments_by_date(self, date):
        return []
    
    def create_appointment(self, appointment):
        print(f"Создана запись: {appointment}")
        return True
    
    def update_appointment(self, appointment):
        print(f"Обновлена запись: {appointment}")
        return True
    
    def delete_appointment(self, appointment_id):
        print(f"Удалена запись ID: {appointment_id}")
        return True
    
    def get_available_time_slots(self, doctor_id, date, duration=30):
        return ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]

class StaffService:
    def get_doctors(self):
        return [
            type('Doctor', (), {'id': 1, 'last_name': 'Петрова', 'first_name': 'Мария', 'specialization': 'Терапевт'}),
            type('Doctor', (), {'id': 2, 'last_name': 'Сидоров', 'first_name': 'Алексей', 'specialization': 'Хирург'}),
            type('Doctor', (), {'id': 3, 'last_name': 'Козлов', 'first_name': 'Дмитрий', 'specialization': 'Стоматолог'})
        ]

class AppointmentDialog(QDialog):
    def __init__(self, appointment=None, parent=None, 
                 client_service=None, patient_service=None, staff_service=None):
        super().__init__(parent)
        logger.debug("🔄 Инициализация AppointmentDialog")
        
        self.appointment = appointment
        
        # Используем сервисы из родительского модуля или создаем новые
        self.client_service = client_service or ClientService()
        self.patient_service = patient_service or PatientService()
        self.staff_service = staff_service or StaffService()
        self.schedule_service = ScheduleService()
        
        logger.debug("✅ Сервисы инициализированы")
        
        self.setup_ui()
        
        if appointment:
            self.load_appointment_data()
        else:
            self.appointment_date.setDate(QDate.currentDate())
        
    def setup_ui(self):
        logger.debug("🔄 Настройка UI AppointmentDialog")
        self.setWindowTitle("✏️ Редактирование записи" if self.appointment else "➕ Новая запись")
        self.setMinimumWidth(700)
        
        layout = QVBoxLayout(self)
        
        # Основная информация
        main_group = QGroupBox("Основная информация о записи")
        main_layout = QFormLayout(main_group)
        
        self.client_combo = QComboBox()
        self.patient_combo = QComboBox()
        self.doctor_combo = QComboBox()
        self.appointment_type_combo = QComboBox()
        self.status_combo = QComboBox()
        
        # Заполняем комбобоксы
        self.appointment_type_combo.addItems([AppointmentType.PRIMARY, AppointmentType.CONSULTATION, 
                                             AppointmentType.PROCEDURE, AppointmentType.OPERATION, 
                                             AppointmentType.VACCINATION, AppointmentType.DIAGNOSTICS])
        self.status_combo.addItems([AppointmentStatus.PLANNED, AppointmentStatus.CONFIRMED, 
                                   AppointmentStatus.WAITING, AppointmentStatus.IN_PROGRESS, 
                                   AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW, 
                                   AppointmentStatus.CANCELLED])
        
        # Дата и время
        self.appointment_date = QDateEdit()
        self.appointment_date.setCalendarPopup(True)
        self.start_time = QTimeEdit()
        self.start_time.setTime(QTime(9, 0))
        self.end_time = QTimeEdit()
        self.end_time.setTime(QTime(9, 30))
        
        main_layout.addRow("Клиент*:", self.client_combo)
        main_layout.addRow("Питомец*:", self.patient_combo)
        main_layout.addRow("Врач*:", self.doctor_combo)
        main_layout.addRow("Тип приема*:", self.appointment_type_combo)
        main_layout.addRow("Дата*:", self.appointment_date)
        main_layout.addRow("Время начала*:", self.start_time)
        main_layout.addRow("Время окончания*:", self.end_time)
        main_layout.addRow("Статус:", self.status_combo)
        
        # Дополнительная информация
        info_group = QGroupBox("Дополнительная информация")
        info_layout = QFormLayout(info_group)
        
        self.assistant_combo = QComboBox()
        self.room_combo = QComboBox()
        self.equipment_edit = QLineEdit()
        self.reason_edit = QLineEdit()
        
        info_layout.addRow("Ассистент:", self.assistant_combo)
        info_layout.addRow("Кабинет:", self.room_combo)
        info_layout.addRow("Необходимое оборудование:", self.equipment_edit)
        info_layout.addRow("Причина визита:", self.reason_edit)
        
        # Повторяющаяся запись
        recurrence_group = QGroupBox("Повторяющаяся запись")
        recurrence_layout = QFormLayout(recurrence_group)
        
        self.is_recurring_check = QCheckBox("Повторяющаяся запись")
        self.recurrence_pattern_combo = QComboBox()
        self.recurrence_pattern_combo.addItems([RepeatPattern.NONE, RepeatPattern.DAILY, 
                                               RepeatPattern.WEEKLY, RepeatPattern.MONTHLY])
        self.recurrence_end_date = QDateEdit()
        self.recurrence_end_date.setCalendarPopup(True)
        self.recurrence_end_date.setDate(QDate.currentDate().addMonths(1))
        
        recurrence_layout.addRow(self.is_recurring_check)
        recurrence_layout.addRow("Периодичность:", self.recurrence_pattern_combo)
        recurrence_layout.addRow("Дата окончания:", self.recurrence_end_date)
        
        # Описание
        notes_group = QGroupBox("Примечания")
        notes_layout = QVBoxLayout(notes_group)
        self.notes_edit = QTextEdit()
        self.notes_edit.setMaximumHeight(100)
        self.notes_edit.setPlaceholderText("Дополнительные заметки о приеме...")
        notes_layout.addWidget(self.notes_edit)
        
        # Кнопки
        button_layout = QHBoxLayout()
        save_btn = QPushButton("💾 Сохранить")
        save_btn.clicked.connect(self.save)
        save_btn.setStyleSheet("background-color: #28a745; color: white; padding: 8px;")
        
        cancel_btn = QPushButton("❌ Отмена")
        cancel_btn.clicked.connect(self.reject)
        cancel_btn.setStyleSheet("background-color: #dc3545; color: white; padding: 8px;")
        
        button_layout.addWidget(save_btn)
        button_layout.addWidget(cancel_btn)
        button_layout.addStretch()
        
        layout.addWidget(main_group)
        layout.addWidget(info_group)
        layout.addWidget(recurrence_group)
        layout.addWidget(notes_group)
        layout.addLayout(button_layout)
        
        # Загружаем данные в комбобоксы
        self.load_combobox_data()
        
        # Связываем чекбокс с видимостью элементов повторения
        self.is_recurring_check.toggled.connect(self.toggle_recurrence_fields)
        self.toggle_recurrence_fields(False)
        
    def toggle_recurrence_fields(self, checked):
        """Показывать/скрывать поля повторения"""
        self.recurrence_pattern_combo.setVisible(checked)
        self.recurrence_end_date.setVisible(checked)
        
    def load_combobox_data(self):
        """Загрузка данных в комбобоксы"""
        try:
            # Загрузка клиентов
            clients = self.client_service.get_all_clients()
            self.client_combo.clear()
            for client in clients:
                client_name = f"{getattr(client, 'last_name', '')} {getattr(client, 'first_name', '')}"
                self.client_combo.addItem(client_name, getattr(client, 'id', 0))
            
            # Загрузка питомцев для выбранного клиента
            if clients:
                self.load_patients_for_client(clients[0].id)
            
            # Загрузка врачей
            doctors = self.staff_service.get_doctors()
            self.doctor_combo.clear()
            for doctor in doctors:
                doctor_name = f"{getattr(doctor, 'last_name', '')} {getattr(doctor, 'first_name', '')} ({getattr(doctor, 'specialization', '')})"
                self.doctor_combo.addItem(doctor_name, getattr(doctor, 'id', 0))
            
            # Ассистенты
            self.assistant_combo.addItem("Не указан", None)
            self.assistant_combo.addItem("Козлова Анна", 3)
            self.assistant_combo.addItem("Васильев Дмитрий", 4)
            
            # Кабинеты
            self.room_combo.addItem("Не указан", None)
            self.room_combo.addItem("Кабинет 101 (Хирургия)", 1)
            self.room_combo.addItem("Кабинет 102 (Терапия)", 2)
            self.room_combo.addItem("Кабинет 103 (Диагностика)", 3)
            self.room_combo.addItem("Кабинет 104 (Стоматология)", 4)
            
            # Подключаем изменение клиента к загрузке питомцев
            self.client_combo.currentIndexChanged.connect(self.on_client_changed)
            
        except Exception as e:
            QMessageBox.warning(self, "Ошибка", f"Не удалось загрузить данные: {str(e)}")
    
    def on_client_changed(self, index):
        """Обработчик изменения выбранного клиента"""
        client_id = self.client_combo.currentData()
        if client_id:
            self.load_patients_for_client(client_id)
    
    def load_patients_for_client(self, client_id):
        """Загрузка питомцев для выбранного клиента"""
        try:
            patients = self.patient_service.get_patients_by_client(client_id)
            self.patient_combo.clear()
            for patient in patients:
                patient_name = f"{getattr(patient, 'name', '')} ({getattr(patient, 'species', '')})"
                self.patient_combo.addItem(patient_name, getattr(patient, 'id', 0))
        except Exception as e:
            print(f"Ошибка загрузки питомцев: {e}")
        
    def load_appointment_data(self):
        """Заполнение полей данными существующей записи"""
        if self.appointment:
            try:
                # Преобразуем строку даты в QDate
                appointment_date = QDate.fromString(str(getattr(self.appointment, 'appointment_date', '')), "yyyy-MM-dd")
                if appointment_date.isValid():
                    self.appointment_date.setDate(appointment_date)
                
                # Время
                start_time_str = getattr(self.appointment, 'start_time', '09:00')
                if isinstance(start_time_str, str):
                    start_time = QTime.fromString(start_time_str, "HH:mm")
                else:
                    start_time = QTime(9, 0)
                
                end_time_str = getattr(self.appointment, 'end_time', '09:30')
                if isinstance(end_time_str, str):
                    end_time = QTime.fromString(end_time_str, "HH:mm")
                else:
                    end_time = QTime(9, 30)
                
                self.start_time.setTime(start_time)
                self.end_time.setTime(end_time)
                
                # Тип и статус
                self.appointment_type_combo.setCurrentText(getattr(self.appointment, 'type', AppointmentType.PRIMARY))
                self.status_combo.setCurrentText(getattr(self.appointment, 'status', AppointmentStatus.PLANNED))
                
                # Оборудование и причина
                self.equipment_edit.setText(getattr(self.appointment, 'equipment_needed', ''))
                self.reason_edit.setText(getattr(self.appointment, 'reason', ''))
                self.notes_edit.setPlainText(getattr(self.appointment, 'notes', ''))
                
                # Повторение
                repeat_pattern = getattr(self.appointment, 'repeat_pattern', RepeatPattern.NONE)
                self.is_recurring_check.setChecked(repeat_pattern != RepeatPattern.NONE)
                if repeat_pattern != RepeatPattern.NONE:
                    self.recurrence_pattern_combo.setCurrentText(repeat_pattern)
                
            except Exception as e:
                logger.error(f"Ошибка загрузки данных записи: {e}")
        
    def validate(self):
        """Проверка обязательных полей"""
        if not self.client_combo.currentData():
            QMessageBox.warning(self, "Ошибка", "Выберите клиента")
            return False
        
        if not self.patient_combo.currentData():
            QMessageBox.warning(self, "Ошибка", "Выберите питомца")
            return False
        
        if not self.doctor_combo.currentData():
            QMessageBox.warning(self, "Ошибка", "Выберите врача")
            return False
        
        if not self.appointment_date.date().isValid():
            QMessageBox.warning(self, "Ошибка", "Неверная дата")
            return False
        
        if self.start_time.time() >= self.end_time.time():
            QMessageBox.warning(self, "Ошибка", "Время окончания должно быть позже времени начала")
            return False
        
        if self.is_recurring_check.isChecked() and not self.recurrence_pattern_combo.currentText():
            QMessageBox.warning(self, "Ошибка", "Выберите периодичность для повторяющейся записи")
            return False
        
        return True
    
    def save(self):
        """Сохранение записи"""
        if not self.validate():
            return
        
        try:
            # Собираем данные для записи
            appointment_data = {
                'id': getattr(self.appointment, 'id', None) if self.appointment else None,
                'client_id': self.client_combo.currentData(),
                'patient_id': self.patient_combo.currentData(),
                'doctor_id': self.doctor_combo.currentData(),
                'assistant_id': self.assistant_combo.currentData(),
                'room_id': self.room_combo.currentData(),
                'appointment_date': self.appointment_date.date().toString("yyyy-MM-dd"),
                'start_time': self.start_time.time().toString("HH:mm"),
                'end_time': self.end_time.time().toString("HH:mm"),
                'type': self.appointment_type_combo.currentText(),
                'status': self.status_combo.currentText(),
                'reason': self.reason_edit.text(),
                'notes': self.notes_edit.toPlainText(),
                'equipment_needed': self.equipment_edit.text(),
                'repeat_pattern': self.recurrence_pattern_combo.currentText() if self.is_recurring_check.isChecked() else RepeatPattern.NONE,
                'repeat_until': self.recurrence_end_date.date().toString("yyyy-MM-dd") if self.is_recurring_check.isChecked() else None
            }
            
            # Сохраняем в базу
            if self.appointment:
                success = self.schedule_service.update_appointment(appointment_data)
                message = "Запись обновлена" if success else "Ошибка обновления"
            else:
                success = self.schedule_service.create_appointment(appointment_data)
                message = "Запись создана" if success else "Ошибка создания"
            
            if success:
                QMessageBox.information(self, "Успех", message)
                self.accept()
            else:
                QMessageBox.critical(self, "Ошибка", message)
                
        except Exception as e:
            QMessageBox.critical(self, "Ошибка", f"Произошла ошибка: {str(e)}")

class ScheduleModule(QWidget):
    def __init__(self, parent=None, client_service=None, patient_service=None, staff_service=None):
        super().__init__(parent)
        logger.debug("🔄 Инициализация ScheduleModule")
        
        try:
            self.main_window = parent
            
            # Используем переданные сервисы или создаем заглушки
            self.client_service = client_service or ClientService()
            self.patient_service = patient_service or PatientService()
            self.staff_service = staff_service or StaffService()
            self.schedule_service = ScheduleService()
            
            logger.debug("✅ Сервисы ScheduleModule инициализированы")
            
        except Exception as e:
            logger.error(f"❌ Ошибка инициализации сервисов: {e}")
            raise
        
        self.current_date = QDate.currentDate()
        self.selected_doctor = None
        self.selected_room = None
        self.view_mode = ViewMode.LIST
        self.time_slots = []
        
        self.setup_ui()
        self.load_initial_data()
        logger.debug("✅ ScheduleModule успешно инициализирован")
        
    def setup_ui(self):
        logger.debug("🔄 Настройка UI ScheduleModule")
        main_layout = QVBoxLayout(self)
        
        # Панель управления
        control_layout = QHBoxLayout()
        
        # Выбор режима просмотра
        view_mode_layout = QHBoxLayout()
        view_mode_label = QLabel("Режим просмотра:")
        self.view_mode_combo = QComboBox()
        self.view_mode_combo.addItems(["Список", "День", "Неделя", "Месяц"])
        self.view_mode_combo.currentTextChanged.connect(self.change_view_mode)
        view_mode_layout.addWidget(view_mode_label)
        view_mode_layout.addWidget(self.view_mode_combo)
        
        # Навигация по датам
        nav_layout = QHBoxLayout()
        
        self.prev_btn = QPushButton("◀️")
        self.prev_btn.clicked.connect(self.previous_period)
        
        self.date_label = QLabel(self.current_date.toString("dd.MM.yyyy"))
        self.date_label.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        
        self.next_btn = QPushButton("▶️")
        self.next_btn.clicked.connect(self.next_period)
        
        today_btn = QPushButton("📅 Сегодня")
        today_btn.clicked.connect(self.go_to_today)
        
        nav_layout.addWidget(self.prev_btn)
        nav_layout.addWidget(self.date_label)
        nav_layout.addWidget(self.next_btn)
        nav_layout.addWidget(today_btn)
        
        # Кнопки действий
        action_layout = QHBoxLayout()
        new_appt_btn = QPushButton("➕ Новая запись")
        new_appt_btn.clicked.connect(self.create_appointment)
        
        refresh_btn = QPushButton("🔄 Обновить")
        refresh_btn.clicked.connect(self.load_schedule)
        
        action_layout.addWidget(new_appt_btn)
        action_layout.addWidget(refresh_btn)
        
        control_layout.addLayout(view_mode_layout)
        control_layout.addStretch()
        control_layout.addLayout(nav_layout)
        control_layout.addStretch()
        control_layout.addLayout(action_layout)
        
        # Контейнер для различных представлений
        self.view_stack = QStackedWidget()
        
        # Представление списка
        self.list_view = self.setup_list_view()
        self.view_stack.addWidget(self.list_view)
        
        # Представление дня
        self.day_view = self.setup_day_view()
        self.view_stack.addWidget(self.day_view)
        
        # Представление недели
        self.week_view = self.setup_week_view()
        self.view_stack.addWidget(self.week_view)
        
        # Представление месяца
        self.month_view = self.setup_month_view()
        self.view_stack.addWidget(self.month_view)
        
        main_layout.addLayout(control_layout)
        main_layout.addWidget(self.view_stack)
        
        logger.debug("✅ UI ScheduleModule настроен")
    
    def setup_list_view(self):
        """Настройка представления в виде списка"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Фильтры
        filter_layout = QHBoxLayout()
        
        self.doctor_combo = QComboBox()
        self.room_combo = QComboBox()
        self.status_combo = QComboBox()
        
        filter_layout.addWidget(QLabel("Врач:"))
        filter_layout.addWidget(self.doctor_combo)
        filter_layout.addWidget(QLabel("Кабинет:"))
        filter_layout.addWidget(self.room_combo)
        filter_layout.addWidget(QLabel("Статус:"))
        filter_layout.addWidget(self.status_combo)
        
        # Таблица расписания
        self.schedule_table = QTableWidget()
        self.schedule_table.setColumnCount(7)
        self.schedule_table.setHorizontalHeaderLabels(["Время", "Клиент", "Питомец", "Врач", "Кабинет", "Тип", "Статус"])
        self.schedule_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.schedule_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.schedule_table.doubleClicked.connect(self.edit_appointment)
        self.schedule_table.setSortingEnabled(True)
        
        layout.addLayout(filter_layout)
        layout.addWidget(self.schedule_table)
        
        return widget
    
    def setup_day_view(self):
        """Настройка представления дня с временными слотами"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        self.day_calendar = QCalendarWidget()
        self.day_calendar.setGridVisible(True)
        self.day_calendar.clicked.connect(self.on_day_selected)
        
        # Контейнер для временных слотов
        self.time_slots_container = QWidget()
        self.time_slots_layout = QGridLayout(self.time_slots_container)
        self.time_slots_layout.setSpacing(5)
        
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setWidget(self.time_slots_container)
        
        layout.addWidget(self.day_calendar)
        layout.addWidget(QLabel("Расписание на день:"))
        layout.addWidget(scroll_area)
        
        return widget
    
    def setup_week_view(self):
        """Настройка представления недели"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        self.week_calendar = QCalendarWidget()
        self.week_calendar.setGridVisible(True)
        self.week_calendar.setSelectionMode(QCalendarWidget.SelectionMode.NoSelection)
        
        # Таблица недельного расписания
        self.week_table = QTableWidget()
        self.week_table.setColumnCount(8)  # Дни недели + заголовок времени
        self.week_table.setRowCount(24)  # Часы дня
        
        layout.addWidget(self.week_calendar)
        layout.addWidget(QLabel("Расписание на неделю:"))
        layout.addWidget(self.week_table)
        
        return widget
    
    def setup_month_view(self):
        """Настройка представления месяца"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        self.month_calendar = QCalendarWidget()
        self.month_calendar.setGridVisible(True)
        self.month_calendar.clicked.connect(self.on_month_day_selected)
        
        layout.addWidget(self.month_calendar)
        layout.addWidget(QLabel("Выберите день для просмотра деталей"))
        
        return widget
    
    def change_view_mode(self, mode_name):
        """Изменение режима просмотра"""
        mode_map = {
            "Список": ViewMode.LIST,
            "День": ViewMode.DAY,
            "Неделя": ViewMode.WEEK,
            "Месяц": ViewMode.MONTH
        }
        
        self.view_mode = mode_map.get(mode_name, ViewMode.LIST)
        
        # Переключаем представление
        if self.view_mode == ViewMode.LIST:
            self.view_stack.setCurrentWidget(self.list_view)
            self.load_list_view()
        elif self.view_mode == ViewMode.DAY:
            self.view_stack.setCurrentWidget(self.day_view)
            self.load_day_view()
        elif self.view_mode == ViewMode.WEEK:
            self.view_stack.setCurrentWidget(self.week_view)
            self.load_week_view()
        elif self.view_mode == ViewMode.MONTH:
            self.view_stack.setCurrentWidget(self.month_view)
            self.load_month_view()
    
    def load_initial_data(self):
        """Загрузка начальных данных"""
        logger.debug("🔄 Загрузка начальных данных")
        try:
            # Загрузка врачей
            doctors = self.staff_service.get_doctors()
            
            self.doctor_combo.clear()
            self.doctor_combo.addItem("Все врачи", None)
            for doctor in doctors:
                doctor_name = f"{getattr(doctor, 'last_name', '')} {getattr(doctor, 'first_name', '')} ({getattr(doctor, 'specialization', '')})"
                doctor_id = getattr(doctor, 'id', 0)
                self.doctor_combo.addItem(doctor_name, doctor_id)
            
            # Загрузка статусов
            self.status_combo.clear()
            self.status_combo.addItem("Все статусы", None)
            statuses = [AppointmentStatus.PLANNED, AppointmentStatus.CONFIRMED, AppointmentStatus.WAITING,
                       AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW,
                       AppointmentStatus.CANCELLED]
            for status in statuses:
                self.status_combo.addItem(status, status)
            
            # Загрузка кабинетов
            self.room_combo.clear()
            self.room_combo.addItem("Все кабинеты", None)
            self.room_combo.addItem("Кабинет 101 (Хирургия)", 1)
            self.room_combo.addItem("Кабинет 102 (Терапия)", 2)
            self.room_combo.addItem("Кабинет 103 (Диагностика)", 3)
            self.room_combo.addItem("Кабинет 104 (Стоматология)", 4)
            
            # Устанавливаем текущую дату в календари
            self.day_calendar.setSelectedDate(self.current_date)
            self.week_calendar.setSelectedDate(self.current_date)
            self.month_calendar.setSelectedDate(self.current_date)
            
            self.load_schedule()
            logger.debug("✅ Начальные данные загружены")
            
        except Exception as e:
            logger.error(f"❌ Ошибка загрузки начальных данных: {e}")
            QMessageBox.critical(self, "Ошибка", f"Не удалось загрузить данные: {str(e)}")
    
    def load_schedule(self):
        """Загрузка расписания в зависимости от режима просмотра"""
        if self.view_mode == ViewMode.LIST:
            self.load_list_view()
        elif self.view_mode == ViewMode.DAY:
            self.load_day_view()
        elif self.view_mode == ViewMode.WEEK:
            self.load_week_view()
        elif self.view_mode == ViewMode.MONTH:
            self.load_month_view()
    
    def load_list_view(self):
        """Загрузка данных в представление списка"""
        try:
            date_str = self.current_date.toString("yyyy-MM-dd")
            
            # Здесь будет загрузка из базы данных
            appointments = self.get_sample_appointments()
            
            self.schedule_table.setRowCount(len(appointments))
            
            for row, appt in enumerate(appointments):
                self.schedule_table.setItem(row, 0, QTableWidgetItem(appt['time']))
                self.schedule_table.setItem(row, 1, QTableWidgetItem(appt['client']))
                self.schedule_table.setItem(row, 2, QTableWidgetItem(appt['patient']))
                self.schedule_table.setItem(row, 3, QTableWidgetItem(appt['doctor']))
                self.schedule_table.setItem(row, 4, QTableWidgetItem(appt['room']))
                self.schedule_table.setItem(row, 5, QTableWidgetItem(appt['type']))
                
                status_item = QTableWidgetItem(appt['status'])
                self.colorize_status(status_item, appt['status'])
                self.schedule_table.setItem(row, 6, status_item)
                
                # Сохраняем ID для редактирования
                if 'id' in appt:
                    self.schedule_table.item(row, 0).setData(Qt.ItemDataRole.UserRole, appt['id'])
            
        except Exception as e:
            logger.error(f"❌ Ошибка загрузки списка: {e}")
    
    def load_day_view(self):
        """Загрузка представления дня с временными слотами"""
        try:
            # Очищаем предыдущие слоты
            for i in reversed(range(self.time_slots_layout.count())): 
                widget = self.time_slots_layout.itemAt(i).widget()
                if widget:
                    widget.setParent(None)
            
            # Генерируем временные слоты (каждые 30 минут с 8:00 до 20:00)
            self.time_slots = []
            start_time = time(8, 0)
            end_time = time(20, 0)
            
            current_time = start_time
            row = 0
            
            while current_time < end_time:
                end_slot_time = (datetime.combine(datetime.today(), current_time) + timedelta(minutes=30)).time()
                
                # Создаем слот времени
                time_label = QLabel(f"{current_time.strftime('%H:%M')} - {end_slot_time.strftime('%H:%M')}")
                time_label.setMinimumWidth(100)
                time_label.setStyleSheet("font-weight: bold; padding: 5px;")
                
                # Кнопка для добавления записи
                add_btn = QPushButton("➕ Запись")
                add_btn.setMaximumWidth(100)
                add_btn.clicked.connect(lambda checked, t=current_time: self.add_appointment_at_time(t))
                
                # Область для отображения существующих записей
                appointments_widget = QWidget()
                appointments_layout = QVBoxLayout(appointments_widget)
                appointments_layout.setSpacing(2)
                
                # Здесь будет добавление существующих записей в этот временной slot
                slot_appointments = self.get_appointments_for_time_slot(current_time, end_slot_time)
                
                for appt in slot_appointments:
                    appt_frame = QFrame()
                    appt_frame.setFrameStyle(QFrame.Shape.Box)
                    appt_frame.setStyleSheet("background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 3px; padding: 2px;")
                    
                    appt_layout = QVBoxLayout(appt_frame)
                    
                    appt_text = QLabel(f"{appt['client']} - {appt['patient']}\n{appt['doctor']} - {appt['type']}")
                    appt_text.setStyleSheet("font-size: 10px;")
                    
                    edit_btn = QPushButton("✏️")
                    edit_btn.setMaximumWidth(30)
                    edit_btn.clicked.connect(lambda checked, a=appt: self.edit_appointment_by_id(a.get('id')))
                    
                    appt_layout.addWidget(appt_text)
                    appt_layout.addWidget(edit_btn)
                    
                    appointments_layout.addWidget(appt_frame)
                
                if not slot_appointments:
                    empty_label = QLabel("Свободно")
                    empty_label.setStyleSheet("color: #666; font-style: italic;")
                    appointments_layout.addWidget(empty_label)
                
                self.time_slots_layout.addWidget(time_label, row, 0)
                self.time_slots_layout.addWidget(add_btn, row, 1)
                self.time_slots_layout.addWidget(appointments_widget, row, 2)
                
                self.time_slots.append({
                    'start': current_time,
                    'end': end_slot_time,
                    'row': row
                })
                
                current_time = end_slot_time
                row += 1
                
        except Exception as e:
            logger.error(f"❌ Ошибка загрузки дня: {e}")
    
    def load_week_view(self):
        """Загрузка представления недели"""
        try:
            # Заголовки дней недели
            days = ["Время", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]
            self.week_table.setHorizontalHeaderLabels(days)
            
            # Заполняем часы
            for hour in range(8, 20):  # с 8:00 до 20:00
                for minute in [0, 30]:  # каждые 30 минут
                    time_str = f"{hour:02d}:{minute:02d}"
                    row = (hour - 8) * 2 + (0 if minute == 0 else 1)
                    
                    time_item = QTableWidgetItem(time_str)
                    self.week_table.setVerticalHeaderItem(row, time_item)
                    
                    # Заполняем ячейки данными
                    for col in range(1, 8):
                        # Здесь будет логика заполнения записей
                        appointments = self.get_appointments_for_week_view(hour, minute, col)
                        if appointments:
                            cell_text = "\n".join([f"{a['client'][0]}.{a['client'].split()[1][0]}. - {a['patient']}" for a in appointments])
                            cell_item = QTableWidgetItem(cell_text)
                            cell_item.setBackground(QColor(230, 245, 230))
                            self.week_table.setItem(row, col, cell_item)
            
            self.week_table.resizeRowsToContents()
            self.week_table.resizeColumnsToContents()
            
        except Exception as e:
            logger.error(f"❌ Ошибка загрузки недели: {e}")
    
    def load_month_view(self):
        """Загрузка представления месяца"""
        try:
            # Подсвечиваем дни с записями
            appointments = self.get_sample_appointments()
            days_with_appointments = set()
            
            for appt in appointments:
                try:
                    appt_date = datetime.strptime(appt.get('date', self.current_date.toString("yyyy-MM-dd")), "%Y-%m-%d")
                    days_with_appointments.add(appt_date.day)
                except:
                    continue
            
            # Подсветка дней в календаре
            for day in days_with_appointments:
                date = QDate(self.current_date.year(), self.current_date.month(), day)
                if date.isValid():
                    format = self.month_calendar.dateTextFormat(date)
                    format.setBackground(QColor(230, 245, 230))
                    self.month_calendar.setDateTextFormat(date, format)
                    
        except Exception as e:
            logger.error(f"❌ Ошибка загрузки месяца: {e}")
    
    def get_sample_appointments(self):
        """Возврат тестовых данных"""
        return [
            {'id': 1, 'time': '09:00 - 09:30', 'client': 'Иванов Иван', 'patient': 'Барсик', 
             'doctor': 'Петрова М.В.', 'room': 'Каб. 101', 'type': 'Вакцинация', 'status': 'подтвержден',
             'date': self.current_date.toString("yyyy-MM-dd")},
            {'id': 2, 'time': '10:00 - 10:30', 'client': 'Сидоров Алексей', 'patient': 'Шарик', 
             'doctor': 'Петрова М.В.', 'room': 'Каб. 101', 'type': 'Осмотр', 'status': 'запланирован',
             'date': self.current_date.toString("yyyy-MM-dd")},
            {'id': 3, 'time': '11:00 - 11:30', 'client': 'Петрова Мария', 'patient': 'Мурка', 
             'doctor': 'Сидоров А.П.', 'room': 'Каб. 102', 'type': 'Стерилизация', 'status': 'подтвержден',
             'date': self.current_date.toString("yyyy-MM-dd")},
            {'id': 4, 'time': '14:00 - 14:30', 'client': 'Козлова Анна', 'patient': 'Рекс', 
             'doctor': 'Козлов Д.В.', 'room': 'Каб. 104', 'type': 'Стоматология', 'status': 'запланирован',
             'date': self.current_date.toString("yyyy-MM-dd")}
        ]
    
    def get_appointments_for_time_slot(self, start_time, end_time):
        """Возврат записей для временного слота"""
        appointments = self.get_sample_appointments()
        result = []
        
        for appt in appointments:
            try:
                appt_start_str = appt['time'].split(' - ')[0]
                appt_start = datetime.strptime(appt_start_str, '%H:%M').time()
                
                if start_time <= appt_start < end_time:
                    result.append(appt)
            except:
                continue
                
        return result
    
    def get_appointments_for_week_view(self, hour, minute, day_of_week):
        """Возврат записей для недельного представления"""
        appointments = self.get_sample_appointments()
        result = []
        
        for appt in appointments:
            try:
                appt_time = appt['time'].split(' - ')[0]
                appt_hour, appt_minute = map(int, appt_time.split(':'))
                
                if appt_hour == hour and appt_minute == minute:
                    result.append(appt)
            except:
                continue
                
        return result
    
    def create_appointment(self):
        """Создание новой записи"""
        try:
            dialog = AppointmentDialog(
                parent=self,
                client_service=self.client_service,
                patient_service=self.patient_service,
                staff_service=self.staff_service
            )
            if dialog.exec():
                self.load_schedule()
                QMessageBox.information(self, "Успех", "Запись успешно создана!")
        except Exception as e:
            logger.error(f"❌ Ошибка создания записи: {e}")
            QMessageBox.critical(self, "Ошибка", f"Не удалось создать запись: {str(e)}")
    
    def add_appointment_at_time(self, start_time):
        """Добавление записи в определенное время"""
        try:
            dialog = AppointmentDialog(
                parent=self,
                client_service=self.client_service,
                patient_service=self.patient_service,
                staff_service=self.staff_service
            )
            # Устанавливаем выбранное время
            dialog.start_time.setTime(QTime(start_time.hour, start_time.minute))
            end_time = (datetime.combine(datetime.today(), start_time) + timedelta(minutes=30)).time()
            dialog.end_time.setTime(QTime(end_time.hour, end_time.minute))
            
            if dialog.exec():
                self.load_schedule()
                QMessageBox.information(self, "Успех", "Запись успешно добавлена!")
        except Exception as e:
            logger.error(f"❌ Ошибка добавления записи: {e}")
            QMessageBox.critical(self, "Ошибка", f"Не удалось добавить запись: {str(e)}")
    
    def edit_appointment(self, index):
        """Редактирование записи из таблицы"""
        try:
            row = index.row()
            item = self.schedule_table.item(row, 0)
            appointment_id = item.data(Qt.ItemDataRole.UserRole) if item else None
            
            if appointment_id:
                self.edit_appointment_by_id(appointment_id)
            else:
                QMessageBox.warning(self, "Внимание", "Не удалось определить запись для редактирования")
                
        except Exception as e:
            logger.error(f"❌ Ошибка редактирования записи: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка при редактировании: {str(e)}")
    
    def edit_appointment_by_id(self, appointment_id):
        """Редактирование записи по ID"""
        try:
            # Загрузка записи
            appointment_data = self.get_appointment_by_id(appointment_id)
            
            if appointment_data:
                # Создаем диалог с данными записи
                dialog = AppointmentDialog(
                    appointment=appointment_data,
                    parent=self,
                    client_service=self.client_service,
                    patient_service=self.patient_service,
                    staff_service=self.staff_service
                )
                if dialog.exec():
                    self.load_schedule()
                    QMessageBox.information(self, "Успех", "Запись успешно обновлена!")
            else:
                QMessageBox.warning(self, "Внимание", "Запись не найдена")
                
        except Exception as e:
            logger.error(f"❌ Ошибка редактирования записи: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка при редактировании: {str(e)}")
    
    def delete_appointment(self, appointment_id):
        """Удаление записи"""
        try:
            reply = QMessageBox.question(self, "Подтверждение", 
                                       "Вы уверены, что хотите удалить эту запись?",
                                       QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
            
            if reply == QMessageBox.StandardButton.Yes:
                success = self.schedule_service.delete_appointment(appointment_id)
                if success:
                    self.load_schedule()
                    QMessageBox.information(self, "Успех", "Запись успешно удалена!")
                else:
                    QMessageBox.critical(self, "Ошибка", "Не удалось удалить запись")
                    
        except Exception as e:
            logger.error(f"❌ Ошибка удаления записи: {e}")
            QMessageBox.critical(self, "Ошибка", f"Ошибка при удалении: {str(e)}")
    
    def get_appointment_by_id(self, appointment_id):
        """Получение записи по ID"""
        appointments = self.get_sample_appointments()
        for appt in appointments:
            if appt.get('id') == appointment_id:
                return appt
        return None
    
    def colorize_status(self, item, status):
        """Цветовая индикация статусов"""
        colors = {
            'запланирован': QColor(255, 255, 200),  # желтый
            'подтвержден': QColor(200, 255, 200),   # зеленый
            'клиент ожидает': QColor(200, 200, 255), # синий
            'идет прием': QColor(255, 200, 200),     # красный
            'прием завершен': QColor(200, 200, 200), # серый
            'неявка': QColor(255, 150, 150),         # светло-красный
            'отменен': QColor(220, 220, 220)         # светло-серый
        }
        
        if status in colors:
            item.setBackground(colors[status])
    
    def previous_period(self):
        """Переход к предыдущему периоду"""
        if self.view_mode == ViewMode.LIST or self.view_mode == ViewMode.DAY:
            self.current_date = self.current_date.addDays(-1)
        elif self.view_mode == ViewMode.WEEK:
            self.current_date = self.current_date.addDays(-7)
        elif self.view_mode == ViewMode.MONTH:
            self.current_date = self.current_date.addMonths(-1)
        
        self.update_date_display()
        self.load_schedule()
    
    def next_period(self):
        """Переход к следующему периоду"""
        if self.view_mode == ViewMode.LIST or self.view_mode == ViewMode.DAY:
            self.current_date = self.current_date.addDays(1)
        elif self.view_mode == ViewMode.WEEK:
            self.current_date = self.current_date.addDays(7)
        elif self.view_mode == ViewMode.MONTH:
            self.current_date = self.current_date.addMonths(1)
        
        self.update_date_display()
        self.load_schedule()
    
    def go_to_today(self):
        """Переход к сегодняшней дате"""
        self.current_date = QDate.currentDate()
        self.update_date_display()
        self.load_schedule()
    
    def update_date_display(self):
        """Обновление отображения даты"""
        self.date_label.setText(self.current_date.toString("dd.MM.yyyy"))
        if hasattr(self, 'day_calendar'):
            self.day_calendar.setSelectedDate(self.current_date)
        if hasattr(self, 'week_calendar'):
            self.week_calendar.setSelectedDate(self.current_date)
        if hasattr(self, 'month_calendar'):
            self.month_calendar.setSelectedDate(self.current_date)
    
    def on_day_selected(self, date):
        """Обработчик выбора дня в календаре"""
        self.current_date = date
        self.update_date_display()
        self.load_day_view()
    
    def on_month_day_selected(self, date):
        """Обработчик выбора дня в месячном календаре"""
        self.current_date = date
        self.view_mode_combo.setCurrentText("День")
        self.change_view_mode("День")

# Дополнительные диалоговые окна
class DoctorScheduleDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("📅 Управление расписанием врачей")
        self.setMinimumWidth(600)
        
        layout = QVBoxLayout(self)
        label = QLabel("Модуль управления расписанием врачей будет реализован в следующей версии")
        label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(label)
        
        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok)
        buttons.accepted.connect(self.accept)
        layout.addWidget(buttons)

class TimeOffDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("🏖️ Заявки на отпуск")
        self.setMinimumWidth(600)
        
        layout = QVBoxLayout(self)
        label = QLabel("Модуль управления заявками на отпуск будет реализован в следующей версии")
        label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(label)
        
        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok)
        buttons.accepted.connect(self.accept)
        layout.addWidget(buttons)

# Экспорт класса для использования в main.py
__all__ = ['ScheduleModule', 'AppointmentDialog']