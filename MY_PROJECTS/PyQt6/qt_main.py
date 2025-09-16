import sys
import os
from pathlib import Path
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                            QTabWidget, QTableWidget, QTableWidgetItem, QLineEdit, QPushButton,
                            QStatusBar, QMessageBox, QHeaderView, QMenuBar, QMenu, QLabel)
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QIcon, QAction

# Добавляем корневую директорию проекта в sys.path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from services.client_service import ClientService
from services.patient_service import PatientService
from services.search_service import SearchService
from qt_client_dialog import ClientDialog
from qt_patient_dialog import PatientDialog

class VetClinicApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.client_service = ClientService()
        self.patient_service = PatientService()
        self.search_service = SearchService()
        
        self.clients = []
        self.patients = []
        
        self.setup_ui()
        self.load_data()
        
    def setup_ui(self):
        self.setWindowTitle("🐾 Ветеринарная Клиника - Система Управления")
        self.setGeometry(100, 100, 1200, 700)
        
        # Центральный виджет
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Главный layout
        main_layout = QVBoxLayout(central_widget)
        
        # Создаем меню
        self.setup_menu()
        
        # Создаем табы
        self.tab_widget = QTabWidget()
        main_layout.addWidget(self.tab_widget)
        
        # Таб клиентов
        self.setup_clients_tab()
        
        # Таб пациентов
        self.setup_patients_tab()
        
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
        
        # Меню Сервис
        service_menu = menubar.addMenu("Сервис")
        refresh_action = QAction("Обновить данные", self)
        refresh_action.triggered.connect(self.load_data)
        service_menu.addAction(refresh_action)
        
    def setup_clients_tab(self):
        clients_tab = QWidget()
        layout = QVBoxLayout(clients_tab)
        
        # Панель поиска
        search_layout = QHBoxLayout()
        
        self.client_search = QLineEdit()
        self.client_search.setPlaceholderText("Поиск по ФИО, телефону, email...")
        self.client_search.textChanged.connect(self.on_client_search_changed)
        
        search_btn = QPushButton("🔍 Поиск")
        search_btn.clicked.connect(self.search_clients)
        
        refresh_btn = QPushButton("🔄 Обновить")
        refresh_btn.clicked.connect(self.load_data)
        
        add_btn = QPushButton("➕ Добавить")
        add_btn.clicked.connect(self.open_client_dialog)
        
        search_layout.addWidget(self.client_search)
        search_layout.addWidget(search_btn)
        search_layout.addWidget(refresh_btn)
        search_layout.addWidget(add_btn)
        
        # Таблица клиентов
        self.clients_table = QTableWidget()
        self.clients_table.setColumnCount(8)
        self.clients_table.setHorizontalHeaderLabels([
            "ID", "Фамилия", "Имя", "Отчество", "Телефон", "Email", "Адрес", "Статус"
        ])
        self.clients_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        self.clients_table.doubleClicked.connect(self.edit_client)
        
        layout.addLayout(search_layout)
        layout.addWidget(self.clients_table)
        
        self.tab_widget.addTab(clients_tab, "👥 Клиенты")
        
    def setup_patients_tab(self):
        patients_tab = QWidget()
        layout = QVBoxLayout(patients_tab)
        
        # Панель поиска
        search_layout = QHBoxLayout()
        
        self.patient_search = QLineEdit()
        self.patient_search.setPlaceholderText("Поиск по кличке, виду, породе, чипу...")
        self.patient_search.textChanged.connect(self.on_patient_search_changed)
        
        search_btn = QPushButton("🔍 Поиск")
        search_btn.clicked.connect(self.search_patients)
        
        refresh_btn = QPushButton("🔄 Обновить")
        refresh_btn.clicked.connect(self.load_data)
        
        add_btn = QPushButton("➕ Добавить")
        add_btn.clicked.connect(self.open_patient_dialog)
        
        search_layout.addWidget(self.patient_search)
        search_layout.addWidget(search_btn)
        search_layout.addWidget(refresh_btn)
        search_layout.addWidget(add_btn)
        
        # Таблица пациентов
        self.patients_table = QTableWidget()
        self.patients_table.setColumnCount(8)
        self.patients_table.setHorizontalHeaderLabels([
            "ID", "Кличка", "Вид", "Порода", "Пол", "Возраст", "Чип", "Статус"
        ])
        self.patients_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        self.patients_table.doubleClicked.connect(self.edit_patient)
        
        layout.addLayout(search_layout)
        layout.addWidget(self.patients_table)
        
        self.tab_widget.addTab(patients_tab, "🐶 Пациенты")
        
    def load_data(self):
        try:
            # Загружаем клиентов
            self.clients = self.client_service.get_all_clients()
            self.clients_table.setRowCount(len(self.clients))
            
            for row, client in enumerate(self.clients):
                self.clients_table.setItem(row, 0, QTableWidgetItem(str(client.id)))
                self.clients_table.setItem(row, 1, QTableWidgetItem(client.last_name))
                self.clients_table.setItem(row, 2, QTableWidgetItem(client.first_name))
                self.clients_table.setItem(row, 3, QTableWidgetItem(client.middle_name))
                self.clients_table.setItem(row, 4, QTableWidgetItem(client.phone))
                self.clients_table.setItem(row, 5, QTableWidgetItem(client.email))
                self.clients_table.setItem(row, 6, QTableWidgetItem(client.status))
            
            # Загружаем пациентов
            self.patients = self.patient_service.get_all_patients()
            self.patients_table.setRowCount(len(self.patients))
            
            for row, patient in enumerate(self.patients):
                self.patients_table.setItem(row, 0, QTableWidgetItem(str(patient.id)))
                self.patients_table.setItem(row, 1, QTableWidgetItem(patient.name))
                self.patients_table.setItem(row, 2, QTableWidgetItem(patient.species))
                self.patients_table.setItem(row, 3, QTableWidgetItem(patient.breed))
                self.patients_table.setItem(row, 4, QTableWidgetItem(patient.gender))
                self.patients_table.setItem(row, 5, QTableWidgetItem(str(patient.age) if patient.age else ""))
                self.patients_table.setItem(row, 6, QTableWidgetItem(patient.chip_number))
                self.patients_table.setItem(row, 7, QTableWidgetItem(patient.status))
            
            self.status_bar.showMessage(f"Загружено: {len(self.clients)} клиентов, {len(self.patients)} пациентов")
            
        except Exception as e:
            self.status_bar.showMessage(f"Ошибка загрузки: {str(e)}")
            QMessageBox.critical(self, "Ошибка", f"Не удалось загрузить данные: {str(e)}")
    
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
                self.clients_table.setItem(row, 3, QTableWidgetItem(client.middle_name))
                self.clients_table.setItem(row, 4, QTableWidgetItem(client.phone))
                self.clients_table.setItem(row, 5, QTableWidgetItem(client.email))
                self.clients_table.setItem(row, 6, QTableWidgetItem(client.status))
            
            self.status_bar.showMessage(f"Найдено клиентов: {len(results)}")
            
        except Exception as e:
            QMessageBox.critical(self, "Ошибка поиска", str(e))
    
    def search_patients(self):
        search_term = self.patient_search.text().strip()
        if not search_term:
            self.load_data()
            return
        
        try:
            results = self.search_service.search_patients(search_term)
            self.patients_table.setRowCount(len(results))
            
            for row, patient in enumerate(results):
                self.patients_table.setItem(row, 0, QTableWidgetItem(str(patient.id)))
                self.patients_table.setItem(row, 1, QTableWidgetItem(patient.name))
                self.patients_table.setItem(row, 2, QTableWidgetItem(patient.species))
                self.patients_table.setItem(row, 3, QTableWidgetItem(patient.breed))
                self.patients_table.setItem(row, 4, QTableWidgetItem(patient.gender))
                self.patients_table.setItem(row, 5, QTableWidgetItem(str(patient.age) if patient.age else ""))
                self.patients_table.setItem(row, 6, QTableWidgetItem(patient.chip_number))
                self.patients_table.setItem(row, 7, QTableWidgetItem(patient.status))
            
            self.status_bar.showMessage(f"Найдено пациентов: {len(results)}")
            
        except Exception as e:
            QMessageBox.critical(self, "Ошибка поиска", str(e))
    
    def on_client_search_changed(self, text):
        if not text.strip():
            self.load_data()
    
    def on_patient_search_changed(self, text):
        if not text.strip():
            self.load_data()
    
    def open_client_dialog(self, client=None):
        dialog = ClientDialog(client, self)
        if dialog.exec():
            self.load_data()
    
    def open_patient_dialog(self, patient=None):
        dialog = PatientDialog(patient, self)
        if dialog.exec():
            self.load_data()
    
    def edit_client(self, index):
        row = index.row()
        if row < len(self.clients):
            self.open_client_dialog(self.clients[row])
    
    def edit_patient(self, index):
        row = index.row()
        if row < len(self.patients):
            self.open_patient_dialog(self.patients[row])

def main():
    app = QApplication(sys.argv)
    
    # Устанавливаем стиль приложения
    app.setStyle('Fusion')
    
    window = VetClinicApp()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()