from PyQt6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QFormLayout, 
                            QLineEdit, QComboBox, QTextEdit, QPushButton, 
                            QMessageBox, QLabel, QGroupBox)
from PyQt6.QtCore import Qt
from models.client import Client
from services.client_service import ClientService
from utils.validators import validators

class ClientDialog(QDialog):
    def __init__(self, client=None, parent=None):
        super().__init__(parent)
        self.client = client
        self.client_service = ClientService()
        
        self.setup_ui()
        
        if client:
            self.load_client_data()
        
    def setup_ui(self):
        self.setWindowTitle("✏️ Редактирование клиента" if self.client else "➕ Добавление клиента")
        self.setMinimumWidth(500)
        
        layout = QVBoxLayout(self)
        
        # Основная информация
        main_group = QGroupBox("Основная информация")
        main_layout = QFormLayout(main_group)
        
        self.last_name_edit = QLineEdit()
        self.first_name_edit = QLineEdit()
        self.middle_name_edit = QLineEdit()
        self.phone_edit = QLineEdit()
        self.email_edit = QLineEdit()
        
        main_layout.addRow("Фамилия*:", self.last_name_edit)
        main_layout.addRow("Имя*:", self.first_name_edit)
        main_layout.addRow("Отчество:", self.middle_name_edit)
        main_layout.addRow("Телефон*:", self.phone_edit)
        main_layout.addRow("Email:", self.email_edit)
        
        # Адрес и статус
        address_group = QGroupBox("Дополнительная информация")
        address_layout = QFormLayout(address_group)
        
        self.address_edit = QLineEdit()  # ← ПОЛЕ АДРЕСА
        self.status_combo = QComboBox()
        self.status_combo.addItems(["активный", "неактивный", "VIP", "должник", "архивный"])
        
        address_layout.addRow("Адрес:", self.address_edit)  # ← ДОБАВЛЕНО
        address_layout.addRow("Статус:", self.status_combo)
        
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
        save_btn.setStyleSheet("background-color: #28a745; color: white;")
        
        cancel_btn = QPushButton("❌ Отмена")
        cancel_btn.clicked.connect(self.reject)
        cancel_btn.setStyleSheet("background-color: #dc3545; color: white;")
        
        button_layout.addWidget(save_btn)
        button_layout.addWidget(cancel_btn)
        button_layout.addStretch()
        
        layout.addWidget(main_group)
        layout.addWidget(address_group)  # ← ДОБАВЛЕНО
        layout.addWidget(notes_group)
        layout.addLayout(button_layout)
        
    def load_client_data(self):
        if self.client:
            self.last_name_edit.setText(self.client.last_name)
            self.first_name_edit.setText(self.client.first_name)
            self.middle_name_edit.setText(self.client.middle_name)
            self.phone_edit.setText(self.client.phone)
            self.email_edit.setText(self.client.email)
            self.address_edit.setText(self.client.address)  # ← ДОБАВЛЕНО
            self.status_combo.setCurrentText(self.client.status)
            self.notes_edit.setPlainText(self.client.notes)
        
    def validate(self):
        if not self.last_name_edit.text().strip():
            QMessageBox.warning(self, "Ошибка", "Фамилия обязательна для заполнения")
            return False
        
        if not self.first_name_edit.text().strip():
            QMessageBox.warning(self, "Ошибка", "Имя обязательно для заполнения")
            return False
        
        if not self.phone_edit.text().strip():
            QMessageBox.warning(self, "Ошибка", "Телефон обязателен для заполнения")
            return False
        
        email = self.email_edit.text().strip()
        if email:
            is_valid, error = validators.validate_email(email)
            if not is_valid:
                QMessageBox.warning(self, "Ошибка", error)
                return False
        
        return True
    
    def save(self):
        if not self.validate():
            return
        
        try:
            client_data = Client(
                id=self.client.id if self.client else None,
                last_name=self.last_name_edit.text().strip(),
                first_name=self.first_name_edit.text().strip(),
                middle_name=self.middle_name_edit.text().strip(),
                phone=self.phone_edit.text().strip(),
                email=self.email_edit.text().strip(),
                address=self.address_edit.text().strip(),  # ← ДОБАВЛЕНО
                status=self.status_combo.currentText(),
                notes=self.notes_edit.toPlainText().strip()
            )
            
            if self.client:
                success = self.client_service.update_client(client_data)
                message = "Данные клиента обновлены" if success else "Ошибка обновления"
            else:
                success = self.client_service.create_client(client_data)
                message = "Клиент добавлен" if success else "Ошибка добавления"
            
            if success:
                QMessageBox.information(self, "Успех", message)
                self.accept()
            else:
                QMessageBox.critical(self, "Ошибка", message)
                
        except Exception as e:
            QMessageBox.critical(self, "Ошибка", f"Произошла ошибка: {str(e)}")