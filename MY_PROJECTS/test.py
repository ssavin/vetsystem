import logging
from PyQt6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QFormLayout, 
                            QLineEdit, QComboBox, QTextEdit, QPushButton, 
                            QMessageBox, QLabel, QGroupBox, QCheckBox,
                            QDateEdit, QTimeEdit, QSpinBox, QWidget)
from PyQt6.QtCore import Qt, QDate, QTime
from PyQt6.QtGui import QFont

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

try:
    from models.appointment import Appointment, AppointmentStatus, AppointmentType
    logger.debug("✅ Модуль models.appointment успешно импортирован")
except ImportError as e:
    logger.error(f"❌ Ошибка импорта models.appointment: {e}")
    # Создаем заглушки для отладки
    class Appointment:
        pass
    class AppointmentStatus:
        PLANNED = "запланирован"
    class AppointmentType:
        PRIMARY = "первичный"

try:
    from services.schedule_service import ScheduleService
    logger.debug("✅ Модуль services.schedule_service успешно импортирован")
except ImportError as e:
    logger.error(f"❌ Ошибка импорта services.schedule_service: {e}")
    # Создаем заглушку
    class ScheduleService:
        def __init__(self):
            logger.debug("✅ ScheduleService инициализирован (заглушка)")

try:
    from services.client_service import ClientService
    logger.debug("✅ Модуль services.client_service успешно импортирован")
except ImportError as e:
    logger.error(f"❌ Ошибка импорта services.client_service: {e}")
    class ClientService:
        def get_all_clients(self):
            return []

try:
    from services.patient_service import PatientService
    logger.debug("✅ Модуль services.patient_service успешно импортирован")
except ImportError as e:
    logger.error(f"❌ Ошибка импорта services.patient_service: {e}")
    class PatientService:
        pass

from datetime import datetime, time

class AppointmentDialog(QDialog):
    def __init__(self, appointment=None, parent=None):
        super().__init__(parent)
        logger.debug("🔄 Инициализация AppointmentDialog")
        
        self.appointment = appointment
        try:
            self.schedule_service = ScheduleService()
            self.client_service = ClientService()
            self.patient_service = PatientService()
            logger.debug("✅ Сервисы инициализированы")
        except Exception as e:
            logger.error(f"❌ Ошибка инициализации сервисов: {e}")
            raise
        
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
        
        # ... остальной код без изменений ...

class ScheduleModule(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        logger.debug("🔄 Инициализация ScheduleModule")
        
        try:
            self.main_window = parent
            self.schedule_service = ScheduleService()
            self.client_service = ClientService()
            self.patient_service = PatientService()
            logger.debug("✅ Сервисы ScheduleModule инициализированы")
        except Exception as e:
            logger.error(f"❌ Ошибка инициализации сервисов: {e}")
            raise
        
        self.current_date = QDate.currentDate()
        self.selected_doctor = None
        self.selected_room = None
        
        self.setup_ui()
        self.load_initial_data()
        logger.debug("✅ ScheduleModule успешно инициализирован")
        
    def setup_ui(self):
        logger.debug("🔄 Настройка UI ScheduleModule")
        main_layout = QHBoxLayout(self)
        
        # Создаем разделитель
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Левая панель - фильтры и управление
        left_panel = self.setup_left_panel()
        
        # Центральная панель - расписание
        center_panel = self.setup_schedule_panel()
        
        splitter.addWidget(left_panel)
        splitter.addWidget(center_panel)
        splitter.setSizes([300, 700])
        
        main_layout.addWidget(splitter)
        logger.debug("✅ UI ScheduleModule настроен")
    
    def setup_left_panel(self):
        logger.debug("🔄 Настройка левой панели")
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Фильтры
        filters_group = QGroupBox("Фильтры")
        filters_layout = QFormLayout(filters_group)
        
        self.doctor_combo = QComboBox()
        self.room_combo = QComboBox()
        self.status_combo = QComboBox()
        
        try:
            self.status_combo.addItems([status.value for status in AppointmentStatus])
            logger.debug("✅ Статусы добавлены в комбобокс")
        except Exception as e:
            logger.error(f"❌ Ошибка добавления статусов: {e}")
            self.status_combo.addItems(["запланирован", "подтвержден"])
        
        filters_layout.addRow("Врач:", self.doctor_combo)
        filters_layout.addRow("Кабинет:", self.room_combo)
        filters_layout.addRow("Статус:", self.status_combo)
        
        # Кнопки действий
        actions_group = QGroupBox("Действия")
        actions_layout = QVBoxLayout(actions_group)
        
        new_appt_btn = QPushButton("➕ Новая запись")
        new_appt_btn.clicked.connect(self.create_appointment)
        
        manage_schedule_btn = QPushButton("📅 Управление расписанием")
        manage_schedule_btn.clicked.connect(self.manage_doctor_schedule)
        
        time_off_btn = QPushButton("🏖️ Заявки на отпуск")
        time_off_btn.clicked.connect(self.manage_time_off)
        
        actions_layout.addWidget(new_appt_btn)
        actions_layout.addWidget(manage_schedule_btn)
        actions_layout.addWidget(time_off_btn)
        actions_layout.addStretch()
        
        layout.addWidget(filters_group)
        layout.addWidget(actions_group)
        
        logger.debug("✅ Левая панель настроена")
        return widget
    
    def setup_schedule_panel(self):
        logger.debug("🔄 Настройка панели расписания")
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Панель навигации по датам
        nav_layout = QHBoxLayout()
        
        prev_day_btn = QPushButton("◀️ День")
        prev_day_btn.clicked.connect(self.previous_day)
        
        self.date_label = QLabel(self.current_date.toString("dd.MM.yyyy"))
        self.date_label.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        
        next_day_btn = QPushButton("День ▶️")
        next_day_btn.clicked.connect(self.next_day)
        
        prev_week_btn = QPushButton("◀️ Неделя")
        prev_week_btn.clicked.connect(self.previous_week)
        
        next_week_btn = QPushButton("Неделя ▶️")
        next_week_btn.clicked.connect(self.next_week)
        
        today_btn = QPushButton("📅 Сегодня")
        today_btn.clicked.connect(self.go_to_today)
        
        nav_layout.addWidget(prev_day_btn)
        nav_layout.addWidget(self.date_label)
        nav_layout.addWidget(next_day_btn)
        nav_layout.addWidget(prev_week_btn)
        nav_layout.addWidget(next_week_btn)
        nav_layout.addWidget(today_btn)
        nav_layout.addStretch()
        
        # Таблица расписания
        self.schedule_table = QTableWidget()
        self.schedule_table.setColumnCount(6)
        self.schedule_table.setHorizontalHeaderLabels(["Время", "Клиент", "Питомец", "Врач", "Кабинет", "Статус"])
        self.schedule_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.schedule_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.schedule_table.doubleClicked.connect(self.edit_appointment)
        
        layout.addLayout(nav_layout)
        layout.addWidget(self.schedule_table)
        
        logger.debug("✅ Панель расписания настроена")
        return widget
    
    def load_initial_data(self):
        """Загрузка начальных данных"""
        logger.debug("🔄 Загрузка начальных данных")
        try:
            # Загрузка врачей
            doctors = []
            try:
                # doctors = self.staff_service.get_doctors()
                doctors = [
                    type('Doctor', (), {'id': 1, 'last_name': 'Петрова', 'first_name': 'Мария'}),
                    type('Doctor', (), {'id': 2, 'last_name': 'Сидоров', 'first_name': 'Алексей'})
                ]
                logger.debug("✅ Врачи загружены")
            except Exception as e:
                logger.error(f"❌ Ошибка загрузки врачей: {e}")
                doctors = []
            
            self.doctor_combo.clear()
            self.doctor_combo.addItem("Все врачи", None)
            for doctor in doctors:
                doctor_name = f"{getattr(doctor, 'last_name', '')} {getattr(doctor, 'first_name', '')}"
                doctor_id = getattr(doctor, 'id', 0)
                self.doctor_combo.addItem(doctor_name, doctor_id)
            
            # Загрузка кабинетов
            self.room_combo.clear()
            self.room_combo.addItem("Все кабинеты", None)
            self.room_combo.addItem("Кабинет 101", 1)
            self.room_combo.addItem("Кабинет 102", 2)
            
            self.load_schedule()
            logger.debug("✅ Начальные данные загружены")
            
        except Exception as e:
            logger.error(f"❌ Ошибка загрузки начальных данных: {e}")
            QMessageBox.critical(self, "Ошибка", f"Не удалось загрузить данные: {str(e)}")
    
    def load_schedule(self):
        """Загрузка расписания на выбранную дату"""
        logger.debug(f"🔄 Загрузка расписания на {self.current_date.toString('yyyy-MM-dd')}")
        try:
            # Временные данные для демонстрации
            appointments = [
                {
                    'time': '09:00 - 09:30',
                    'client': 'Иванов Иван',
                    'patient': 'Барсик',
                    'doctor': 'Петрова М.В.',
                    'room': 'Каб. 101',
                    'status': 'подтвержден'
                },
                {
                    'time': '10:00 - 10:30', 
                    'client': 'Сидоров А.',
                    'patient': 'Шарик',
                    'doctor': 'Петрова М.В.',
                    'room': 'Каб. 101',
                    'status': 'запланирован'
                }
            ]
            
            self.schedule_table.setRowCount(len(appointments))
            
            for row, appt in enumerate(appointments):
                self.schedule_table.setItem(row, 0, QTableWidgetItem(appt['time']))
                self.schedule_table.setItem(row, 1, QTableWidgetItem(appt['client']))
                self.schedule_table.setItem(row, 2, QTableWidgetItem(appt['patient']))
                self.schedule_table.setItem(row, 3, QTableWidgetItem(appt['doctor']))
                self.schedule_table.setItem(row, 4, QTableWidgetItem(appt['room']))
                
                status_item = QTableWidgetItem(appt['status'])
                self.colorize_status(status_item, appt['status'])
                self.schedule_table.setItem(row, 5, status_item)
            
            logger.debug(f"✅ Расписание загружено: {len(appointments)} записей")
            
        except Exception as e:
            logger.error(f"❌ Ошибка загрузки расписания: {e}")
            QMessageBox.critical(self, "Ошибка", f"Не удалось загрузить расписание: {str(e)}")
    
    # ... остальные методы без изменений ...

# Диалоговые окна для управления расписанием
class AppointmentDialog(QDialog):
    # Реализация диалога создания/редактирования записи
    pass

class DoctorScheduleDialog(QDialog):
    # Реализация диалога управления расписанием врачей
    pass

class TimeOffDialog(QDialog):
    # Реализация диалога управления отпусками
    pass