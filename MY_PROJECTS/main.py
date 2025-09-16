import sys
import os
from pathlib import Path
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                            QTabWidget, QTableWidget, QTableWidgetItem, QLineEdit, QPushButton,
                            QStatusBar, QMessageBox, QHeaderView, QMenuBar, QMenu, QLabel,
                            QToolBar, QDockWidget, QTextEdit, QGroupBox, QFormLayout,
                            QSplitter, QFrame, QStackedWidget)
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QIcon, QAction, QPixmap, QFont

# Добавляем корневую директорию проекта в sys.path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Импортируем наши сервисы
from services.client_service import ClientService
from services.patient_service import PatientService
from services.search_service import SearchService
from qt_client_dialog import ClientDialog
from qt_patient_dialog import PatientDialog

# Импортируем модуль расписания с обработкой ошибок
try:
    from schedule_module import ScheduleModule
    print("✅ Модуль расписания успешно импортирован")
except ImportError as e:
    print(f"❌ Ошибка импорта модуля расписания: {e}")
    # Создаем заглушку для тестирования
    class ScheduleModule(QWidget):
        def __init__(self, parent=None, client_service=None, patient_service=None, staff_service=None):
            super().__init__(parent)
            layout = QVBoxLayout(self)
            label = QLabel("📅 Модуль расписания (заглушка)\nФайл schedule_module.py не найден или содержит ошибки")
            label.setFont(QFont("Arial", 12, QFont.Weight.Bold))
            label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            layout.addWidget(label)
            
            error_label = QLabel(f"Ошибка: {str(e)}")
            error_label.setWordWrap(True)
            layout.addWidget(error_label)

# Создаем заглушки для других модулей
class ModuleStub(QWidget):
    def __init__(self, title, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        label = QLabel(f"📦 {title}\nМодуль в разработке")
        label.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(label)
        
        info_label = QLabel("Данный модуль будет реализован в следующей версии")
        info_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(info_label)

# Настройка шрифта для эмодзи
def setup_emoji_font():
    """Настройка шрифта с поддержкой эмодзи"""
    font = QFont()
    font.setPointSize(10)
    # Пробуем разные шрифты с поддержкой эмодзи
    font_families = []
    
    # Windows
    if sys.platform == "win32":
        font_families = ["Segoe UI Emoji", "Segoe UI Symbol", "Arial"]
    # macOS
    elif sys.platform == "darwin":
        font_families = ["Apple Color Emoji", "SF Pro", "Helvetica"]
    # Linux
    else:
        font_families = ["Noto Color Emoji", "DejaVu Sans", "Liberation Sans"]
    
    # Устанавливаем семейство шрифтов
    if hasattr(QFont, 'setFamilies'):
        font.setFamilies(font_families)
    else:
        font.setFamily(font_families[0] if font_families else "Arial")
    
    return font

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.client_service = ClientService()
        self.patient_service = PatientService()
        self.search_service = SearchService()
        
        # Инициализация staff_service если нужен
        self.staff_service = None
        try:
            from services.staff_service import StaffService
            self.staff_service = StaffService()
        except ImportError:
            print("⚠️ StaffService не найден, будет использована заглушка")
        
        self.clients = []
        self.patients = []
        self.current_client_id = None
        self.current_client_patients = []
        
        # Инициализация stacked widget для модулей
        self.stacked_widget = QStackedWidget()
        
        self.setup_ui()
        self.load_data()
        
    def setup_ui(self):
        self.setWindowTitle("🐾 Ветеринарная Клиника - Комплексная система управления")
        self.setGeometry(100, 100, 1600, 900)
        
        # Создаем меню
        self.setup_menu()
        
        # Создаем панель инструментов с модулями
        self.setup_toolbar()
        
        # Создаем главный модуль (регистратура)
        self.main_module = self.setup_main_module()
        self.stacked_widget.addWidget(self.main_module)
        
        # Устанавливаем stacked widget как центральный
        self.setCentralWidget(self.stacked_widget)
        
        # Статус бар
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Готово")
        
    def setup_main_module(self):
        """Создает главный модуль (регистратура)"""
        central_widget = QWidget()
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
        
        return central_widget
        
    def setup_menu(self):
        menubar = self.menuBar()
        
        # Меню Файл
        file_menu = menubar.addMenu("Файл")
        
        home_action = QAction("🏠 Главная", self)
        home_action.triggered.connect(self.show_main_module)
        file_menu.addAction(home_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("Выход", self)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Меню Вид
        view_menu = menubar.addMenu("Вид")
        view_menu.addAction("Обновить")
        
    def setup_toolbar(self):
        # Создаем тулбар с крупными иконками
        toolbar = QToolBar("Модули системы")
        toolbar.setIconSize(QSize(42, 42))
        toolbar.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextUnderIcon)
        self.addToolBar(toolbar)
        
        # Настраиваем шрифт для тулбара
        toolbar_font = setup_emoji_font()
        toolbar.setFont(toolbar_font)
        
        # Кнопка возврата на главную
        home_btn = QAction("🏠 Главная", self)
        home_btn.setToolTip("Вернуться на главный экран")
        home_btn.triggered.connect(self.show_main_module)
        toolbar.addAction(home_btn)
        
        toolbar.addSeparator()
        
        # Модуль 1: Регистратура и Клиентская база
        module1 = QAction("🏥 Регистратура", self)
        module1.setToolTip("Регистратура и Клиентская база")
        module1.triggered.connect(self.show_main_module)
        toolbar.addAction(module1)
        
        # Модуль 2: Расписание и Запись на прием
        module2 = QAction("📅 Расписание", self)
        module2.setToolTip("Расписание и Запись на прием")
        module2.triggered.connect(self.show_module2)
        toolbar.addAction(module2)
        
        # Модуль 3: Электронная Медицинская Карта
        module3 = QAction("📋 ЭМК", self)
        module3.setToolTip("Электронная Медицинская Карта")
        module3.triggered.connect(self.show_module3)
        toolbar.addAction(module3)
        
        # Модуль 4: Услуги и Складской учет
        module4 = QAction("📦 Склад", self)
        module4.setToolTip("Услуги и Складской учет")
        module4.triggered.connect(self.show_module4)
        toolbar.addAction(module4)
        
        # Модуль 5: Финансы и Касса
        module5 = QAction("💰 Финансы", self)
        module5.setToolTip("Финансы и Касса")
        module5.triggered.connect(self.show_module5)
        toolbar.addAction(module5)
        
        # Модуль 6: Отчеты и Аналитика
        module6 = QAction("📊 Отчеты", self)
        module6.setToolTip("Отчеты и Аналитика")
        module6.triggered.connect(self.show_module6)
        toolbar.addAction(module6)
        
        # Модуль 7: Администрирование и Безопасность
        module7 = QAction("🔐 Админ", self)
        module7.setToolTip("Администрирование и Безопасность")
        module7.triggered.connect(self.show_module7)
        toolbar.addAction(module7)
        
        # Модуль 8: Медицинское оборудование
        module8 = QAction("⚕️ Оборудование", self)
        module8.setToolTip("Медицинское оборудование")
        module8.triggered.connect(self.show_module8)
        toolbar.addAction(module8)
        
        # Модуль 9: ИИ-Ассистент
        module9 = QAction("🤖 ИИ", self)
        module9.setToolTip("ИИ-Ассистент")
        module9.triggered.connect(self.show_module9)
        toolbar.addAction(module9)
        
        # Модуль 10: Техподдержка
        module10 = QAction("🔧 Поддержка", self)
        module10.setToolTip("Техподдержка")
        module10.triggered.connect(self.show_module10)
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
        
        search_btn = QPushButton("🔍 Поиск")
        search_btn.clicked.connect(self.search_clients)
        search_btn.setToolTip("Поиск")
        
        refresh_btn = QPushButton("🔄 Обновить")
        refresh_btn.clicked.connect(self.load_data)
        refresh_btn.setToolTip("Обновить")
        
        add_btn = QPushButton("➕ Добавить")
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
    
    # Методы модулей системы
    def show_main_module(self):
        """Показывает главный модуль (регистратура)"""
        self.status_bar.showMessage("Главный модуль: Регистратура - активен")
        self.stacked_widget.setCurrentWidget(self.main_module)
    
    def show_module2(self):
        """Показывает модуль расписания"""
        try:
            self.status_bar.showMessage("Модуль: Расписание и Запись на прием - активен")
            
            # Проверяем, есть ли уже модуль расписания
            module_index = -1
            for i in range(self.stacked_widget.count()):
                if isinstance(self.stacked_widget.widget(i), ScheduleModule):
                    module_index = i
                    break
            
            if module_index == -1:
                # Создаем новый модуль и передаем существующие сервисы
                schedule_module = ScheduleModule(
                    parent=self,
                    client_service=self.client_service,
                    patient_service=self.patient_service,
                    staff_service=self.staff_service
                )
                self.stacked_widget.addWidget(schedule_module)
                module_index = self.stacked_widget.count() - 1
            
            # Показываем модуль
            self.stacked_widget.setCurrentIndex(module_index)
            
        except Exception as e:
            QMessageBox.critical(self, "Ошибка", f"Не удалось открыть модуль расписания: {str(e)}")
    
    def show_module3(self):
        """Показывает модуль электронных медицинских карт"""
        self.show_stub_module("📋 Электронные Медицинские Карты", "ЭМК")
    
    def show_module4(self):
        """Показывает модуль склада"""
        self.show_stub_module("📦 Услуги и Складской учет", "Склад")
    
    def show_module5(self):
        """Показывает модуль финансов"""
        self.show_stub_module("💰 Финансы и Касса", "Финансы")
    
    def show_module6(self):
        """Показывает модуль отчетов"""
        self.show_stub_module("📊 Отчеты и Аналитика", "Отчеты")
    
    def show_module7(self):
        """Показывает модуль администрирования"""
        self.show_stub_module("🔐 Администрирование и Безопасность", "Администрирование")
    
    def show_module8(self):
        """Показывает модуль оборудования"""
        self.show_stub_module("⚕️ Медицинское оборудование", "Оборудование")
    
    def show_module9(self):
        """Показывает модуль ИИ-ассистента"""
        self.show_stub_module("🤖 ИИ-Ассистент", "ИИ-Ассистент")
    
    def show_module10(self):
        """Показывает модуль техподдержки"""
        self.show_stub_module("🔧 Техподдержка", "Техподдержка")
    
    def show_stub_module(self, title, short_name):
        """Показывает заглушку для модуля"""
        self.status_bar.showMessage(f"Модуль: {short_name} - в разработке")
        
        # Создаем или находим заглушку
        module_index = -1
        for i in range(self.stacked_widget.count()):
            if isinstance(self.stacked_widget.widget(i), ModuleStub):
                module_index = i
                break
        
        if module_index == -1:
            # Создаем новую заглушку
            stub_module = ModuleStub(title, self)
            self.stacked_widget.addWidget(stub_module)
            module_index = self.stacked_widget.count() - 1
        
        # Показываем заглушку
        self.stacked_widget.setCurrentIndex(module_index)

def main():
    app = QApplication(sys.argv)
    
    # Устанавливаем стиль приложения
    app.setStyle('Fusion')
    
    # Устанавливаем шрифт по умолчанию
    app_font = setup_emoji_font()
    app.setFont(app_font)
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()