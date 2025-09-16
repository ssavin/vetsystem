import sys
import os
from pathlib import Path
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                            QTabWidget, QTableWidget, QTableWidgetItem, QLineEdit, QPushButton,
                            QStatusBar, QMessageBox, QHeaderView, QMenuBar, QMenu, QLabel,
                            QToolBar, QDockWidget, QTextEdit, QGroupBox, QFormLayout,
                            QSplitter, QFrame)
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QIcon, QAction, QPixmap, QFont

# Добавляем корневую директорию проекта в sys.path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from services.client_service import ClientService
from services.patient_service import PatientService
from services.search_service import SearchService
from qt_client_dialog import ClientDialog
from qt_patient_dialog import PatientDialog

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.client_service = ClientService()
        self.patient_service = PatientService()
        self.search_service = SearchService()
        
        self.clients = []
        self.patients = []
        self.current_client_id = None
        self.current_client_patients = []
        
        self.setup_ui()
        self.load_data()
        
    def setup_ui(self):
        self.setWindowTitle("🐾 Ветеринарная Клиника - Комплексная система управления")
        self.setGeometry(100, 100, 1600, 900)
        
        # Создаем меню
        self.setup_menu()
        
        # Создаем панель инструментов с модулями
        self.setup_toolbar()
        
        # Центральный виджет
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Главный layout
        main_layout = QHBoxLayout(central_widget)
        
        # Разделитель
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Левая панель - список клиентов
        left_widget = self.setup_clients_panel()
        
        # Центральная панель - детальная информация о клиенте
        center_widget = self.setup_details_panel()
        
        # Правая панель - питомцы клиента
        right_widget = self.setup_patients_panel()
        
        splitter.addWidget(left_widget)
        splitter.addWidget(center_widget)
        splitter.addWidget(right_widget)
        splitter.setSizes([400, 500, 500])
        
        main_layout.addWidget(splitter)
        
        # Статус бар
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Готово")
        
    def setup_menu(self):
        menubar = self.menuBar()
        
        # Меню Файл
        file_menu = menubar.addMenu("Файл")
        exit_action = QAction("Выход", self)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
    def setup_toolbar(self):
        toolbar = QToolBar("Модули системы")
        toolbar.setIconSize(QSize(32, 32))  # указываем размер иконок
        toolbar.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextUnderIcon)  # Текст под иконкой
        self.addToolBar(toolbar)
        
        # Модуль 1: Регистратура и Клиентская база
        module1 = QAction("🏥", self)
        module1.setText("Регистратура")
        module1.setToolTip("Регистратура и Клиентская база")
        toolbar.addAction(module1)
        
        # Модуль 2: Расписание и Запись на прием
        module2 = QAction("📅", self)
        module2.setText("Расписание")
        module2.setToolTip("Расписание и Запись на прием")
        toolbar.addAction(module2)
        
        # Модуль 3: Электронная Медицинская Карта
        module3 = QAction("📋", self)
        module3.setText("ЭМК")
        module3.setToolTip("Электронная Медицинская Карта")
        toolbar.addAction(module3)
        
        # Модуль 4: Услуги и Складской учет
        module4 = QAction("📦", self)
        module4.setText("Склад")
        module4.setToolTip("Услуги и Складской учет")
        toolbar.addAction(module4)
        
        # Модуль 5: Финансы и Касса
        module5 = QAction("💰", self)
        module5.setText("Финансы")
        module5.setToolTip("Финансы и Касса")
        toolbar.addAction(module5)
        
        # Модуль 6: Отчеты и Аналитика
        module6 = QAction("📊", self)
        module6.setText("Отчеты")
        module6.setToolTip("Отчеты и Аналитика")
        toolbar.addAction(module6)
        
        # Модуль 7: Администрирование и Безопасность
        module7 = QAction("🔐", self)
        module7.setText("Администрирование")
        module7.setToolTip("Администрирование и Безопасность")
        toolbar.addAction(module7)
        
        # Модуль 8: Медицинское оборудование
        module8 = QAction("⚕️", self)
        module8.setText("Оборудование")
        module8.setToolTip("Медицинское оборудование")
        toolbar.addAction(module8)
        
        # Модуль 9: ИИ-Ассистент
        module9 = QAction("🤖", self)
        module9.setText("ИИ-Ассистент")
        module9.setToolTip("ИИ-Ассистент")
        toolbar.addAction(module9)
        
        # Модуль 10: Техподдержка
        module10 = QAction("🔧", self)
        module10.setText("Техподдержка")
        module10.setToolTip("Техподдержка")
        toolbar.addAction(module10)
        
    def setup_clients_panel(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Заголовок
        title = QLabel("👥 Клиенты")
        title.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        layout.addWidget(title)
        
        # Поиск
        search_layout = QHBoxLayout()
        self.client_search = QLineEdit()
        self.client_search.setPlaceholderText("Поиск клиентов...")
        self.client_search.textChanged.connect(self.on_client_search_changed)
        
        search_btn = QPushButton("🔍")
        search_btn.clicked.connect(self.search_clients)
        search_btn.setToolTip("Поиск")
        
        refresh_btn = QPushButton("🔄")
        refresh_btn.clicked.connect(self.load_data)
        refresh_btn.setToolTip("Обновить")
        
        add_btn = QPushButton("➕")
        add_btn.clicked.connect(self.open_client_dialog)
        add_btn.setToolTip("Добавить клиента")
        
        search_layout.addWidget(self.client_search)
        search_layout.addWidget(search_btn)
        search_layout.addWidget(refresh_btn)
        search_layout.addWidget(add_btn)
        
        # Таблица клиентов
        self.clients_table = QTableWidget()
        self.clients_table.setColumnCount(4)
        self.clients_table.setHorizontalHeaderLabels(["ID", "Фамилия", "Имя", "Телефон"])
        self.clients_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.clients_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.clients_table.clicked.connect(self.show_client_details)
        
        layout.addLayout(search_layout)
        layout.addWidget(self.clients_table)
        
        return widget
        
    def setup_details_panel(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Заголовок
        title = QLabel("📋 Информация о клиенте")
        title.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        layout.addWidget(title)
        
        # Группа детальной информации
        details_group = QGroupBox("Основная информация")
        details_layout = QFormLayout(details_group)
        
        self.client_details = {
            'name': QLabel("Не выбрано"),
            'phone': QLabel("Не выбрано"),
            'email': QLabel("Не выбрано"),
            'address': QLabel("Не выбрано"),
            'status': QLabel("Не выбрано")
        }
        
        # Устанавливаем стиль для меток
        for label in self.client_details.values():
            label.setStyleSheet("QLabel { padding: 5px; border: 1px solid #ddd; border-radius: 3px; }")
        
        details_layout.addRow("ФИО:", self.client_details['name'])
        details_layout.addRow("Телефон:", self.client_details['phone'])
        details_layout.addRow("Email:", self.client_details['email'])
        details_layout.addRow("Адрес:", self.client_details['address'])
        details_layout.addRow("Статус:", self.client_details['status'])
        
        # Кнопки действий
        action_layout = QHBoxLayout()
        edit_btn = QPushButton("✏️ Редактировать")
        edit_btn.clicked.connect(self.edit_current_client)
        
        history_btn = QPushButton("📋 История обращений")
        history_btn.clicked.connect(self.show_client_history)
        
        action_layout.addWidget(edit_btn)
        action_layout.addWidget(history_btn)
        action_layout.addStretch()
        
        layout.addWidget(details_group)
        layout.addLayout(action_layout)
        layout.addStretch()
        
        return widget
        
    def setup_patients_panel(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Заголовок
        title = QLabel("🐶 Питомцы клиента")
        title.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        layout.addWidget(title)
        
        # Кнопки управления питомцами
        pets_actions = QHBoxLayout()
        add_pet_btn = QPushButton("➕ Добавить питомца")
        add_pet_btn.clicked.connect(self.open_patient_dialog)
        
        refresh_pets_btn = QPushButton("🔄 Обновить")
        refresh_pets_btn.clicked.connect(self.load_client_patients)
        
        pets_actions.addWidget(add_pet_btn)
        pets_actions.addWidget(refresh_pets_btn)
        pets_actions.addStretch()
        
        # Таблица питомцев
        self.patients_table = QTableWidget()
        self.patients_table.setColumnCount(5)
        self.patients_table.setHorizontalHeaderLabels(["ID", "Кличка", "Вид", "Порода", "Статус"])
        self.patients_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.patients_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.patients_table.doubleClicked.connect(self.edit_patient)
        
        layout.addLayout(pets_actions)
        layout.addWidget(self.patients_table)
        
        return widget
        
    def load_data(self):
        try:
            # Загружаем клиентов
            self.clients = self.client_service.get_all_clients()
            self.clients_table.setRowCount(len(self.clients))
            
            for row, client in enumerate(self.clients):
                self.clients_table.setItem(row, 0, QTableWidgetItem(str(client.id)))
                self.clients_table.setItem(row, 1, QTableWidgetItem(client.last_name))
                self.clients_table.setItem(row, 2, QTableWidgetItem(client.first_name))
                self.clients_table.setItem(row, 3, QTableWidgetItem(client.phone))
            
            self.status_bar.showMessage(f"Загружено клиентов: {len(self.clients)}")
            
        except Exception as e:
            self.status_bar.showMessage(f"Ошибка загрузки: {str(e)}")
            QMessageBox.critical(self, "Ошибка", f"Не удалось загрузить данные: {str(e)}")
    
    def load_client_patients(self):
        if not self.current_client_id:
            return
            
        try:
            self.current_client_patients = self.patient_service.get_patients_by_client(self.current_client_id)
            self.patients_table.setRowCount(len(self.current_client_patients))
            
            for row, patient in enumerate(self.current_client_patients):
                self.patients_table.setItem(row, 0, QTableWidgetItem(str(patient.id)))
                self.patients_table.setItem(row, 1, QTableWidgetItem(patient.name))
                self.patients_table.setItem(row, 2, QTableWidgetItem(patient.species))
                self.patients_table.setItem(row, 3, QTableWidgetItem(patient.breed))
                self.patients_table.setItem(row, 4, QTableWidgetItem(patient.status))
            
            self.status_bar.showMessage(f"Загружено питомцев: {len(self.current_client_patients)}")
            
        except Exception as e:
            self.status_bar.showMessage(f"Ошибка загрузки питомцев: {str(e)}")
    
    def show_client_details(self, index):
        row = index.row()
        if row < len(self.clients):
            client = self.clients[row]
            self.current_client_id = client.id
            
            # Обновляем детальную информацию
            full_name = f"{client.last_name} {client.first_name} {client.middle_name}".strip()
            self.client_details['name'].setText(full_name)
            self.client_details['phone'].setText(client.phone)
            self.client_details['email'].setText(client.email)
            self.client_details['address'].setText(client.address)
            self.client_details['status'].setText(client.status)
            
            # Загружаем питомцев клиента
            self.load_client_patients()
    
    def search_clients(self):
        search_term = self.client_search.text().strip()
        if not search_term:
            self.load_data()
            return
        
        try:
            results = self.search_service.search_clients(search_term)
            self.clients_table.setRowCount(len(results))
            
            for row, client in enumerate(results):
                self.clients_table.setItem(row, 0, QTableWidgetItem(str(client.id)))
                self.clients_table.setItem(row, 1, QTableWidgetItem(client.last_name))
                self.clients_table.setItem(row, 2, QTableWidgetItem(client.first_name))
                self.clients_table.setItem(row, 3, QTableWidgetItem(client.phone))
            
            self.status_bar.showMessage(f"Найдено клиентов: {len(results)}")
            
        except Exception as e:
            QMessageBox.critical(self, "Ошибка поиска", str(e))
    
    def on_client_search_changed(self, text):
        if not text.strip():
            self.load_data()
    
    def open_client_dialog(self, client=None):
        dialog = ClientDialog(client, self)
        if dialog.exec():
            self.load_data()
    
    def open_patient_dialog(self, patient=None):
        if not self.current_client_id:
            QMessageBox.warning(self, "Внимание", "Сначала выберите клиента")
            return
            
        dialog = PatientDialog(patient, self.current_client_id, self)
        if dialog.exec():
            self.load_client_patients()
    
    def edit_current_client(self):
        if self.current_client_id:
            client = next((c for c in self.clients if c.id == self.current_client_id), None)
            if client:
                self.open_client_dialog(client)
        else:
            QMessageBox.warning(self, "Внимание", "Выберите клиента для редактирования")
    
    def edit_patient(self, index):
        row = index.row()
        if row < len(self.current_client_patients):
            patient = self.current_client_patients[row]
            self.open_patient_dialog(patient)
    
    def show_client_history(self):
        if self.current_client_id:
            QMessageBox.information(self, "История обращений", 
                                  f"История обращений клиента #{self.current_client_id}\n\n"
                                  "Здесь будет отображаться полная история визитов, "
                                  "лечения и финансовых операций.")
        else:
            QMessageBox.warning(self, "Внимание", "Выберите клиента")

def main():
    app = QApplication(sys.argv)
    
    # Устанавливаем стиль приложения
    app.setStyle('Fusion')
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()