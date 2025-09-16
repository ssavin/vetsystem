from PyQt6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QFormLayout, 
                            QLineEdit, QComboBox, QTextEdit, QPushButton, 
                            QMessageBox, QLabel, QGroupBox, QCheckBox,
                            QDateEdit, QTimeEdit, QSpinBox)
from PyQt6.QtCore import Qt, QDate, QTime
from PyQt6.QtGui import QFont
from models.appointment import Appointment, AppointmentStatus, AppointmentType
from services.schedule_service import ScheduleService
from services.client_service import ClientService
from services.patient_service import PatientService
from datetime import datetime, time

class AppointmentDialog(QDialog):
    def __init__(self, appointment=None, parent=None):
        super().__init__(parent)
        self.appointment = appointment
        self.schedule_service = ScheduleService()
        self.client_service = ClientService()
        self.patient_service = PatientService()
        
        self.setup_ui()
        
        if appointment:
            self.load_appointment_data()
        else:
            self.appointment_date.setDate(QDate.currentDate())
        
    def setup_ui(self):
        self.setWindowTitle("?? Редактирование записи" if self.appointment else "? Новая запись")
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
        self.appointment_type_combo.addItems([t.value for t in AppointmentType])
        self.status_combo.addItems([s.value for s in AppointmentStatus])
        
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
        
        info_layout.addRow("Ассистент:", self.assistant_combo)
        info_layout.addRow("Кабинет:", self.room_combo)
        info_layout.addRow("Необходимое оборудование:", self.equipment_edit)
        
        # Повторяющаяся запись
        recurrence_group = QGroupBox("Повторяющаяся запись")
        recurrence_layout = QFormLayout(recurrence_group)
        
        self.is_recurring_check = QCheckBox("Повторяющаяся запись")
        self.recurrence_pattern_combo = QComboBox()
        self.recurrence_pattern_combo.addItems(["", "ежедневно", "еженедельно", "ежемесячно"])
        self.recurrence_end_date = QDateEdit()
        self.recurrence_end_date.setCalendarPopup(True)
        
        recurrence_layout.addRow(self.is_recurring_check)
        recurrence_layout.addRow("Периодичность:", self.recurrence_pattern_combo)
        recurrence_layout.addRow("Дата окончания:", self.recurrence_end_date)
        
        # Описание
        notes_group = QGroupBox("Описание приема")
        notes_layout = QVBoxLayout(notes_group)
        self.description_edit = QTextEdit()
        self.description_edit.setMaximumHeight(100)
        notes_layout.addWidget(self.description_edit)
        
        # Кнопки
        button_layout = QHBoxLayout()
        save_btn = QPushButton("?? Сохранить")
        save_btn.clicked.connect(self.save)
        save_btn.setStyleSheet("background-color: #28a745; color: white; padding: 8px;")
        
        cancel_btn = QPushButton("? Отмена")
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
        
    def load_combobox_data(self):
        # Загрузка клиентов, врачей и т.д. из базы данных
        try:
            # Здесь должен быть код загрузки данных из соответствующих сервисов
            pass
        except Exception as e:
            QMessageBox.warning(self, "Ошибка", f"Не удалось загрузить данные: {str(e)}")
        
    def load_appointment_data(self):
        if self.appointment:
            # Заполняем поля данными из существующей записи
            self.appointment_date.setDate(QDate(self.appointment.appointment_date))
            self.start_time.setTime(QTime(self.appointment.start_time.hour, self.appointment.start_time.minute))
            self.end_time.setTime(QTime(self.appointment.end_time.hour, self.appointment.end_time.minute))
            self.appointment_type_combo.setCurrentText(self.appointment.appointment_type.value)
            self.status_combo.setCurrentText(self.appointment.status.value)
            self.equipment_edit.setText(self.appointment.equipment_needed)
            self.is_recurring_check.setChecked(self.appointment.is_recurring)
            self.recurrence_pattern_combo.setCurrentText(self.appointment.recurrence_pattern)
            if self.appointment.recurrence_end_date:
                self.recurrence_end_date.setDate(QDate(self.appointment.recurrence_end_date))
            self.description_edit.setPlainText(self.appointment.description)
        
    def validate(self):
        # Проверка обязательных полей
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
        
        return True
    
    def save(self):
        if not self.validate():
            return
        
        try:
            appointment_data = Appointment(
                id=self.appointment.id if self.appointment else None,
                client_id=self.client_combo.currentData(),
                patient_id=self.patient_combo.currentData(),
                doctor_id=self.doctor_combo.currentData(),
                assistant_id=self.assistant_combo.currentData(),
                room_id=self.room_combo.currentData(),
                appointment_date=self.appointment_date.date().toPyDate(),
                start_time=self.start_time.time().toPyTime(),
                end_time=self.end_time.time().toPyTime(),
                appointment_type=AppointmentType(self.appointment_type_combo.currentText()),
                status=AppointmentStatus(self.status_combo.currentText()),
                description=self.description_edit.toPlainText(),
                equipment_needed=self.equipment_edit.text(),
                is_recurring=self.is_recurring_check.isChecked(),
                recurrence_pattern=self.recurrence_pattern_combo.currentText(),
                recurrence_end_date=self.recurrence_end_date.date().toPyDate() if self.recurrence_end_date.date().isValid() else None
            )
            
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