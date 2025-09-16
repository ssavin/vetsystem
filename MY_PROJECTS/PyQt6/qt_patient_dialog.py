from PyQt6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QFormLayout, 
                            QLineEdit, QComboBox, QTextEdit, QPushButton, 
                            QMessageBox, QLabel, QGroupBox, QCheckBox)
from PyQt6.QtCore import Qt
from models.patient import Patient
from services.patient_service import PatientService
from utils.validators import validators
from datetime import datetime

class PatientDialog(QDialog):
    def __init__(self, patient=None, client_id=None, parent=None):
        super().__init__(parent)
        self.patient = patient
        self.client_id = client_id
        self.patient_service = PatientService()
        
        self.setup_ui()
        
        if patient:
            self.load_patient_data()
        
    def setup_ui(self):
        title = "✏️ Редактирование пациента" if self.patient else "➕ Добавление пациента"
        if self.client_id:
            title += f" (Клиент #{self.client_id})"
        self.setWindowTitle(title)
        
        self.setMinimumWidth(600)
        
        layout = QVBoxLayout(self)
        
        # Основная информация
        main_group = QGroupBox("Основная информация")
        main_layout = QFormLayout(main_group)
        
        self.name_edit = QLineEdit()
        self.species_combo = QComboBox()
        self.species_combo.addItems(["", "Собака", "Кошка", "Попугай", "Хомяк", "Кролик", "Черепаха", "Другое"])
        self.breed_edit = QLineEdit()
        self.gender_combo = QComboBox()
        self.gender_combo.addItems(["", "самец", "самка", "неизвестно"])
        
        main_layout.addRow("Кличка*:", self.name_edit)
        main_layout.addRow("Вид*:", self.species_combo)
        main_layout.addRow("Порода:", self.breed_edit)
        main_layout.addRow("Пол:", self.gender_combo)
        
        # Дополнительная информация
        info_group = QGroupBox("Дополнительная информация")
        info_layout = QFormLayout(info_group)
        
        self.birth_date_edit = QLineEdit()
        self.birth_date_edit.setPlaceholderText("ГГГГ-ММ-ДД")
        self.age_edit = QLineEdit()
        self.color_edit = QLineEdit()
        self.special_marks_edit = QLineEdit()
        self.chip_number_edit = QLineEdit()
        self.is_neutered_check = QCheckBox()
        
        info_layout.addRow("Дата рождения:", self.birth_date_edit)
        info_layout.addRow("Возраст:", self.age_edit)
        info_layout.addRow("Окрас:", self.color_edit)
        info_layout.addRow("Особые приметы:", self.special_marks_edit)
        info_layout.addRow("Номер чипа:", self.chip_number_edit)
        info_layout.addRow("Кастрация/стерилизация:", self.is_neutered_check)
        
        # Медицинская информация
        medical_group = QGroupBox("Медицинская информация")
        medical_layout = QFormLayout(medical_group)
        
        self.allergies_edit = QLineEdit()
        self.chronic_diseases_edit = QLineEdit()
        self.status_combo = QComboBox()
        self.status_combo.addItems(["", "активный", "неактивный", "умер", "передан", "архивный"])
        
        medical_layout.addRow("Аллергии:", self.allergies_edit)
        medical_layout.addRow("Хронические заболевания:", self.chronic_diseases_edit)
        medical_layout.addRow("Статус:", self.status_combo)
        
        # Заметки
        notes_group = QGroupBox("Заметки")
        notes_layout = QVBoxLayout(notes_group)
        self.notes_edit = QTextEdit()
        self.notes_edit.setMaximumHeight(100)
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
        layout.addWidget(medical_group)
        layout.addWidget(notes_group)
        layout.addLayout(button_layout)
        
    def load_patient_data(self):
        if self.patient:
            self.name_edit.setText(self.patient.name)
            self.species_combo.setCurrentText(self.patient.species)
            self.breed_edit.setText(self.patient.breed)
            self.gender_combo.setCurrentText(self.patient.gender)
            
            if self.patient.birth_date:
                self.birth_date_edit.setText(self.patient.birth_date.strftime('%Y-%m-%d'))
            
            if self.patient.age:
                self.age_edit.setText(str(self.patient.age))
            
            self.color_edit.setText(self.patient.color)
            self.special_marks_edit.setText(self.patient.special_marks)
            self.chip_number_edit.setText(self.patient.chip_number)
            self.is_neutered_check.setChecked(self.patient.is_neutered)
            self.allergies_edit.setText(self.patient.allergies)
            self.chronic_diseases_edit.setText(self.patient.chronic_diseases)
            self.status_combo.setCurrentText(self.patient.status)
            self.notes_edit.setPlainText(self.patient.notes)
        
    def validate(self):
        if not self.name_edit.text().strip():
            QMessageBox.warning(self, "Ошибка", "Кличка обязательна для заполнения")
            return False
        
        if not self.species_combo.currentText().strip():
            QMessageBox.warning(self, "Ошибка", "Вид обязателен для заполнения")
            return False
        
        # Валидация возраста
        age = self.age_edit.text().strip()
        if age:
            is_valid, error = validators.validate_age(age)
            if not is_valid:
                QMessageBox.warning(self, "Ошибка", error)
                return False
        
        # Валидация номера чипа
        chip_number = self.chip_number_edit.text().strip()
        if chip_number:
            is_valid, error = validators.validate_chip_number(chip_number)
            if not is_valid:
                QMessageBox.warning(self, "Ошибка", error)
                return False
        
        # Валидация даты рождения
        birth_date = self.birth_date_edit.text().strip()
        if birth_date:
            is_valid, error, date_obj = validators.validate_date(birth_date, "Дата рождения")
            if not is_valid:
                QMessageBox.warning(self, "Ошибка", error)
                return False
        
        return True
    
    def save(self):
        if not self.validate():
            return
        
        try:
            # Обработка данных
            birth_date = None
            birth_date_str = self.birth_date_edit.text().strip()
            if birth_date_str:
                birth_date = datetime.strptime(birth_date_str, '%Y-%m-%d').date()
            
            age = None
            age_str = self.age_edit.text().strip()
            if age_str:
                age = int(age_str)
            
            patient_data = Patient(
                id=self.patient.id if self.patient else None,
                name=self.name_edit.text().strip(),
                species=self.species_combo.currentText(),
                breed=self.breed_edit.text().strip(),
                gender=self.gender_combo.currentText(),
                birth_date=birth_date,
                age=age,
                color=self.color_edit.text().strip(),
                special_marks=self.special_marks_edit.text().strip(),
                chip_number=self.chip_number_edit.text().strip(),
                is_neutered=self.is_neutered_check.isChecked(),
                allergies=self.allergies_edit.text().strip(),
                chronic_diseases=self.chronic_diseases_edit.text().strip(),
                status=self.status_combo.currentText(),
                notes=self.notes_edit.toPlainText().strip()
            )
            
            if self.patient:
                success = self.patient_service.update_patient(patient_data)
                message = "Данные пациента обновлены" if success else "Ошибка обновления"
            else:
                # Связываем пациента с клиентом
                success = self.patient_service.create_patient(patient_data)
                if success and self.client_id:
                    # Создаем связь между клиентом и пациентом
                    link_success = self.patient_service.link_client_patient(
                        self.client_id, patient_data.id, "владелец", True
                    )
                    if not link_success:
                        QMessageBox.warning(self, "Внимание", "Пациент создан, но не связан с клиентом")
                message = "Пациент добавлен" if success else "Ошибка добавления"
            
            if success:
                QMessageBox.information(self, "Успех", message)
                self.accept()
            else:
                QMessageBox.critical(self, "Ошибка", message)
                
        except Exception as e:
            QMessageBox.critical(self, "Ошибка", f"Произошла ошибка: {str(e)}")