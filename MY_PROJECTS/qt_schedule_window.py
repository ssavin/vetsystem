from PyQt6.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                            QTableWidget, QTableWidgetItem, QPushButton, QDateEdit,
                            QComboBox, QLabel, QGroupBox, QCalendarWidget, QSplitter)
from PyQt6.QtCore import Qt, QDate
from PyQt6.QtGui import QFont, QColor
from models.appointment import Appointment, AppointmentStatus
from services.schedule_service import ScheduleService
from qt_appointment_dialog import AppointmentDialog

class ScheduleWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.schedule_service = ScheduleService()
        self.current_date = QDate.currentDate()
        self.appointments = []
        
        self.setup_ui()
        self.load_appointments()
        
    def setup_ui(self):
        self.setWindowTitle("📅 Расписание и запись на прием")
        self.setGeometry(100, 100, 1200, 800)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        layout = QVBoxLayout(central_widget)
        
        # Панель управления
        control_layout = QHBoxLayout()
        
        self.date_edit = QDateEdit()
        self.date_edit.setDate(self.current_date)
        self.date_edit.dateChanged.connect(self.on_date_changed)
        
        self.doctor_combo = QComboBox()
        self.view_combo = QComboBox()
        self.view_combo.addItems(["День", "Неделя", "Месяц"])
        
        new_btn = QPushButton("➕ Новая запись")
        new_btn.clicked.connect(self.open_new_appointment)
        
        refresh_btn = QPushButton("🔄 Обновить")
        refresh_btn.clicked.connect(self.load_appointments)
        
        control_layout.addWidget(QLabel("Дата:"))
        control_layout.addWidget(self.date_edit)
        control_layout.addWidget(QLabel("Врач:"))
        control_layout.addWidget(self.doctor_combo)
        control_layout.addWidget(QLabel("Вид:"))
        control_layout.addWidget(self.view_combo)
        control_layout.addWidget(new_btn)
        control_layout.addWidget(refresh_btn)
        control_layout.addStretch()
        
        # Разделитель
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Календарь
        calendar_group = QGroupBox("Календарь")
        calendar_layout = QVBoxLayout(calendar_group)
        self.calendar = QCalendarWidget()
        self.calendar.clicked.connect(self.on_calendar_clicked)
        calendar_layout.addWidget(self.calendar)
        
        # Таблица расписания
        schedule_group = QGroupBox("Расписание на день")
        schedule_layout = QVBoxLayout(schedule_group)
        
        self.schedule_table = QTableWidget()
        self.schedule_table.setColumnCount(6)
        self.schedule_table.setHorizontalHeaderLabels(["Время", "Клиент", "Питомец", "Врач", "Тип", "Статус"])
        self.schedule_table.doubleClicked.connect(self.edit_appointment)
        
        schedule_layout.addWidget(self.schedule_table)
        
        splitter.addWidget(calendar_group)
        splitter.addWidget(schedule_group)
        splitter.setSizes([300, 900])
        
        layout.addLayout(control_layout)
        layout.addWidget(splitter)
        
    def load_appointments(self):
        try:
            self.appointments = self.schedule_service.get_appointments_by_date(
                self.current_date.toPyDate()
            )
            
            self.schedule_table.setRowCount(len(self.appointments))
            
            for row, appointment in enumerate(self.appointments):
                self.schedule_table.setItem(row, 0, QTableWidgetItem(
                    f"{appointment.start_time.strftime('%H:%M')} - {appointment.end_time.strftime('%H:%M')}"
                ))
                self.schedule_table.setItem(row, 1, QTableWidgetItem(
                    f"{appointment.client_last_name} {appointment.client_first_name}"
                ))
                self.schedule_table.setItem(row, 2, QTableWidgetItem(appointment.patient_name))
                self.schedule_table.setItem(row, 3, QTableWidgetItem(
                    f"{appointment.doctor_last_name} {appointment.doctor_first_name}"
                ))
                self.schedule_table.setItem(row, 4, QTableWidgetItem(appointment.appointment_type.value))
                
                status_item = QTableWidgetItem(appointment.status.value)
                # Раскрашиваем статусы
                if appointment.status == AppointmentStatus.COMPLETED:
                    status_item.setBackground(QColor(144, 238, 144))  # Светло-зеленый
                elif appointment.status == AppointmentStatus.CANCELLED:
                    status_item.setBackground(QColor(255, 182, 193))  # Светло-розовый
                elif appointment.status == AppointmentStatus.NO_SHOW:
                    status_item.setBackground(QColor(255, 160, 122))  # Светло-коралловый
                
                self.schedule_table.setItem(row, 5, status_item)
                
        except Exception as e:
            print(f"Ошибка загрузки расписания: {e}")
    
    def on_date_changed(self, date):
        self.current_date = date
        self.load_appointments()
    
    def on_calendar_clicked(self, date):
        self.date_edit.setDate(date)
    
    def open_new_appointment(self):
        dialog = AppointmentDialog(parent=self)
        if dialog.exec():
            self.load_appointments()
    
    def edit_appointment(self, index):
        row = index.row()
        if row < len(self.appointments):
            appointment = self.appointments[row]
            dialog = AppointmentDialog(appointment, self)
            if dialog.exec():
                self.load_appointments()

# Для интеграции с главным меню
def show_schedule_module():
    window = ScheduleWindow()
    window.show()