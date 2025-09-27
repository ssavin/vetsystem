"""
Модуль настроек
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import json
import os
from .integrations import MoySkladAPI, YooKassaPayments, FiscalPrinter, BackupManager


class SettingsModule:
    def __init__(self, parent, db, main_app):
        self.parent = parent
        self.db = db
        self.main_app = main_app
        
        self.frame = ttk.Frame(parent)
        self.create_interface()
        self.load_settings()
        
    def create_interface(self):
        """Создание интерфейса настроек"""
        # Notebook для категорий настроек
        self.settings_notebook = ttk.Notebook(self.frame)
        self.settings_notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Вкладки настроек
        self.create_general_settings()
        self.create_printer_settings()
        self.create_integration_settings()
        self.create_backup_settings()
        
        # Кнопки управления
        btn_frame = ttk.Frame(self.frame)
        btn_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(btn_frame, text="Сохранить", 
                  command=self.save_settings).pack(side=tk.RIGHT, padx=5)
        ttk.Button(btn_frame, text="Сбросить", 
                  command=self.reset_settings).pack(side=tk.RIGHT, padx=5)
        ttk.Button(btn_frame, text="Экспорт настроек", 
                  command=self.export_settings).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Импорт настроек", 
                  command=self.import_settings).pack(side=tk.LEFT, padx=5)
        
    def create_general_settings(self):
        """Общие настройки"""
        general_frame = ttk.Frame(self.settings_notebook)
        self.settings_notebook.add(general_frame, text="Общие")
        
        # Информация о компании
        company_frame = ttk.LabelFrame(general_frame, text="Информация о компании")
        company_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Название компании
        ttk.Label(company_frame, text="Название:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        self.company_name_var = tk.StringVar()
        ttk.Entry(company_frame, textvariable=self.company_name_var, width=50).grid(row=0, column=1, padx=5, pady=5, sticky=tk.W+tk.E)
        
        # Адрес
        ttk.Label(company_frame, text="Адрес:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        self.company_address_var = tk.StringVar()
        ttk.Entry(company_frame, textvariable=self.company_address_var, width=50).grid(row=1, column=1, padx=5, pady=5, sticky=tk.W+tk.E)
        
        # ИНН
        ttk.Label(company_frame, text="ИНН:").grid(row=2, column=0, sticky=tk.W, padx=5, pady=5)
        self.company_inn_var = tk.StringVar()
        ttk.Entry(company_frame, textvariable=self.company_inn_var, width=20).grid(row=2, column=1, padx=5, pady=5, sticky=tk.W)
        
        company_frame.grid_columnconfigure(1, weight=1)
        
        # Настройки кассы
        cash_frame = ttk.LabelFrame(general_frame, text="Настройки кассы")
        cash_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Валюта
        ttk.Label(cash_frame, text="Валюта:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        self.currency_var = tk.StringVar()
        currency_combo = ttk.Combobox(cash_frame, textvariable=self.currency_var, 
                                     values=['RUB', 'USD', 'EUR'], state="readonly", width=10)
        currency_combo.grid(row=0, column=1, padx=5, pady=5, sticky=tk.W)
        
        # НДС
        ttk.Label(cash_frame, text="Ставка НДС (%):").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        self.tax_rate_var = tk.StringVar()
        tax_spinbox = tk.Spinbox(cash_frame, textvariable=self.tax_rate_var, 
                                from_=0, to=30, width=10)
        tax_spinbox.grid(row=1, column=1, padx=5, pady=5, sticky=tk.W)
        
        # Автоматическое резервное копирование
        self.auto_backup_var = tk.BooleanVar()
        ttk.Checkbutton(cash_frame, text="Автоматическое резервное копирование", 
                       variable=self.auto_backup_var).grid(row=2, column=0, columnspan=2, sticky=tk.W, padx=5, pady=5)
        
    def create_printer_settings(self):
        """Настройки принтеров"""
        printer_frame = ttk.Frame(self.settings_notebook)
        self.settings_notebook.add(printer_frame, text="Принтеры")
        
        # Принтер чеков
        receipt_frame = ttk.LabelFrame(printer_frame, text="Принтер чеков")
        receipt_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Название принтера
        ttk.Label(receipt_frame, text="Принтер:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        self.printer_name_var = tk.StringVar()
        printer_combo = ttk.Combobox(receipt_frame, textvariable=self.printer_name_var, width=40)
        printer_combo.grid(row=0, column=1, padx=5, pady=5, sticky=tk.W+tk.E)
        
        ttk.Button(receipt_frame, text="Обновить список", 
                  command=self.update_printer_list).grid(row=0, column=2, padx=5, pady=5)
        
        # Тест принтера
        ttk.Button(receipt_frame, text="Тест печати", 
                  command=self.test_printer).grid(row=1, column=0, padx=5, pady=5)
        
        receipt_frame.grid_columnconfigure(1, weight=1)
        
        # Фискальный принтер
        fiscal_frame = ttk.LabelFrame(printer_frame, text="Фискальный принтер")
        fiscal_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Использовать фискальный принтер
        self.fiscal_printer_var = tk.BooleanVar()
        ttk.Checkbutton(fiscal_frame, text="Использовать фискальный принтер", 
                       variable=self.fiscal_printer_var).grid(row=0, column=0, columnspan=3, sticky=tk.W, padx=5, pady=5)
        
        # Тип принтера
        ttk.Label(fiscal_frame, text="Тип принтера:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        self.fiscal_type_var = tk.StringVar()
        fiscal_type_combo = ttk.Combobox(fiscal_frame, textvariable=self.fiscal_type_var, 
                                        values=['Атол', 'Viki Print', 'Штрих-М'], 
                                        state="readonly", width=20)
        fiscal_type_combo.grid(row=1, column=1, padx=5, pady=5, sticky=tk.W)
        
        # COM-порт
        ttk.Label(fiscal_frame, text="COM-порт:").grid(row=2, column=0, sticky=tk.W, padx=5, pady=5)
        self.fiscal_port_var = tk.StringVar()
        port_combo = ttk.Combobox(fiscal_frame, textvariable=self.fiscal_port_var, 
                                 values=['COM1', 'COM2', 'COM3', 'COM4'], width=10)
        port_combo.grid(row=2, column=1, padx=5, pady=5, sticky=tk.W)
        
        # Скорость
        ttk.Label(fiscal_frame, text="Скорость:").grid(row=3, column=0, sticky=tk.W, padx=5, pady=5)
        self.fiscal_speed_var = tk.StringVar()
        speed_combo = ttk.Combobox(fiscal_frame, textvariable=self.fiscal_speed_var, 
                                  values=['9600', '19200', '38400', '57600', '115200'], 
                                  state="readonly", width=10)
        speed_combo.grid(row=3, column=1, padx=5, pady=5, sticky=tk.W)
        
        # Тест фискального принтера
        ttk.Button(fiscal_frame, text="Тест фискального принтера", 
                  command=self.test_fiscal_printer).grid(row=4, column=0, columnspan=2, padx=5, pady=10, sticky=tk.W)
        
    def create_integration_settings(self):
        """Настройки интеграций"""
        integration_frame = ttk.Frame(self.settings_notebook)
        self.settings_notebook.add(integration_frame, text="Интеграции")
        
        # МойСклад
        moysklad_frame = ttk.LabelFrame(integration_frame, text="МойСклад")
        moysklad_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Синхронизация
        self.moysklad_sync_var = tk.BooleanVar()
        ttk.Checkbutton(moysklad_frame, text="Включить синхронизацию с МойСклад", 
                       variable=self.moysklad_sync_var).grid(row=0, column=0, columnspan=2, sticky=tk.W, padx=5, pady=5)
        
        # Токен API
        ttk.Label(moysklad_frame, text="Токен API:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        self.moysklad_token_var = tk.StringVar()
        ttk.Entry(moysklad_frame, textvariable=self.moysklad_token_var, width=50, show="*").grid(row=1, column=1, padx=5, pady=5, sticky=tk.W+tk.E)
        
        # Кнопки тестирования
        test_frame = ttk.Frame(moysklad_frame)
        test_frame.grid(row=2, column=0, columnspan=2, sticky=tk.W, padx=5, pady=10)
        
        ttk.Button(test_frame, text="Тест соединения", 
                  command=self.test_moysklad_connection).pack(side=tk.LEFT, padx=5)
        ttk.Button(test_frame, text="Синхронизировать товары", 
                  command=self.sync_products).pack(side=tk.LEFT, padx=5)
        
        moysklad_frame.grid_columnconfigure(1, weight=1)
        
        # YooKassa
        yookassa_frame = ttk.LabelFrame(integration_frame, text="YooKassa (ЮKassa)")
        yookassa_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Включить YooKassa
        self.yookassa_enabled_var = tk.BooleanVar()
        ttk.Checkbutton(yookassa_frame, text="Включить приём платежей через YooKassa", 
                       variable=self.yookassa_enabled_var).grid(row=0, column=0, columnspan=2, sticky=tk.W, padx=5, pady=5)
        
        # Shop ID
        ttk.Label(yookassa_frame, text="Shop ID:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        self.yookassa_shop_id_var = tk.StringVar()
        ttk.Entry(yookassa_frame, textvariable=self.yookassa_shop_id_var, width=30).grid(row=1, column=1, padx=5, pady=5, sticky=tk.W)
        
        # Secret Key
        ttk.Label(yookassa_frame, text="Secret Key:").grid(row=2, column=0, sticky=tk.W, padx=5, pady=5)
        self.yookassa_secret_var = tk.StringVar()
        ttk.Entry(yookassa_frame, textvariable=self.yookassa_secret_var, width=50, show="*").grid(row=2, column=1, padx=5, pady=5, sticky=tk.W+tk.E)
        
        # Тест YooKassa
        ttk.Button(yookassa_frame, text="Тест YooKassa", 
                  command=self.test_yookassa).grid(row=3, column=0, padx=5, pady=10, sticky=tk.W)
        
        yookassa_frame.grid_columnconfigure(1, weight=1)
        
    def create_backup_settings(self):
        """Настройки резервного копирования"""
        backup_frame = ttk.Frame(self.settings_notebook)
        self.settings_notebook.add(backup_frame, text="Резервное копирование")
        
        # Автоматическое резервное копирование
        auto_frame = ttk.LabelFrame(backup_frame, text="Автоматическое резервное копирование")
        auto_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Включить автокопирование
        self.auto_backup_enabled_var = tk.BooleanVar()
        ttk.Checkbutton(auto_frame, text="Включить автоматическое резервное копирование", 
                       variable=self.auto_backup_enabled_var).grid(row=0, column=0, columnspan=2, sticky=tk.W, padx=5, pady=5)
        
        # Папка для резервных копий
        ttk.Label(auto_frame, text="Папка для резервных копий:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        
        backup_path_frame = ttk.Frame(auto_frame)
        backup_path_frame.grid(row=1, column=1, sticky=tk.W+tk.E, padx=5, pady=5)
        
        self.backup_path_var = tk.StringVar()
        ttk.Entry(backup_path_frame, textvariable=self.backup_path_var, width=40).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(backup_path_frame, text="Обзор...", 
                  command=self.select_backup_folder).pack(side=tk.RIGHT, padx=(5, 0))
        
        # Периодичность
        ttk.Label(auto_frame, text="Периодичность:").grid(row=2, column=0, sticky=tk.W, padx=5, pady=5)
        self.backup_frequency_var = tk.StringVar()
        frequency_combo = ttk.Combobox(auto_frame, textvariable=self.backup_frequency_var, 
                                      values=['Ежедневно', 'Еженедельно', 'Ежемесячно'], 
                                      state="readonly", width=15)
        frequency_combo.grid(row=2, column=1, padx=5, pady=5, sticky=tk.W)
        
        auto_frame.grid_columnconfigure(1, weight=1)
        
        # Ручное резервное копирование
        manual_frame = ttk.LabelFrame(backup_frame, text="Ручное резервное копирование")
        manual_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Информация о базе данных
        db_info = f"База данных: {self.db.db_path}\\nРазмер: {self.get_db_size()}"
        ttk.Label(manual_frame, text=db_info).pack(padx=10, pady=10)
        
        # Кнопки резервного копирования
        backup_btn_frame = ttk.Frame(manual_frame)
        backup_btn_frame.pack(pady=10)
        
        ttk.Button(backup_btn_frame, text="Создать резервную копию", 
                  command=self.create_backup).pack(side=tk.LEFT, padx=5)
        ttk.Button(backup_btn_frame, text="Восстановить из резервной копии", 
                  command=self.restore_backup).pack(side=tk.LEFT, padx=5)
        
        # История резервных копий
        history_frame = ttk.LabelFrame(backup_frame, text="История резервных копий")
        history_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Таблица резервных копий
        columns = ('Дата', 'Размер', 'Путь')
        self.backup_tree = ttk.Treeview(history_frame, columns=columns, show='headings', height=8)
        
        for col in columns:
            self.backup_tree.heading(col, text=col)
            self.backup_tree.column(col, width=150)
            
        backup_scrollbar = ttk.Scrollbar(history_frame, orient=tk.VERTICAL, command=self.backup_tree.yview)
        self.backup_tree.configure(yscrollcommand=backup_scrollbar.set)
        
        self.backup_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        backup_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Загрузка истории резервных копий
        self.load_backup_history()
        
    def load_settings(self):
        """Загрузка настроек из базы данных"""
        # Общие настройки
        self.company_name_var.set(self.db.get_setting('company_name') or '')
        self.company_address_var.set(self.db.get_setting('company_address') or '')
        self.company_inn_var.set(self.db.get_setting('company_inn') or '')
        self.currency_var.set(self.db.get_setting('currency') or 'RUB')
        self.tax_rate_var.set(self.db.get_setting('tax_rate') or '20')
        
        # Принтеры
        self.printer_name_var.set(self.db.get_setting('printer_name') or '')
        self.fiscal_printer_var.set(bool(int(self.db.get_setting('fiscal_printer') or '0')))
        self.fiscal_type_var.set(self.db.get_setting('fiscal_type') or 'Атол')
        self.fiscal_port_var.set(self.db.get_setting('fiscal_port') or 'COM1')
        self.fiscal_speed_var.set(self.db.get_setting('fiscal_speed') or '9600')
        
        # Интеграции
        self.moysklad_sync_var.set(bool(int(self.db.get_setting('moysklad_sync') or '0')))
        self.moysklad_token_var.set(self.db.get_setting('moysklad_token') or '')
        
        # Резервное копирование
        self.auto_backup_enabled_var.set(bool(int(self.db.get_setting('auto_backup') or '0')))
        self.backup_path_var.set(self.db.get_setting('backup_path') or os.path.expanduser('~/VetPOS_Backups'))
        self.backup_frequency_var.set(self.db.get_setting('backup_frequency') or 'Ежедневно')
        
    def save_settings(self):
        """Сохранение настроек в базу данных"""
        try:
            # Общие настройки
            self.db.set_setting('company_name', self.company_name_var.get())
            self.db.set_setting('company_address', self.company_address_var.get())
            self.db.set_setting('company_inn', self.company_inn_var.get())
            self.db.set_setting('currency', self.currency_var.get())
            self.db.set_setting('tax_rate', self.tax_rate_var.get())
            
            # Принтеры
            self.db.set_setting('printer_name', self.printer_name_var.get())
            self.db.set_setting('fiscal_printer', '1' if self.fiscal_printer_var.get() else '0')
            self.db.set_setting('fiscal_type', self.fiscal_type_var.get())
            self.db.set_setting('fiscal_port', self.fiscal_port_var.get())
            self.db.set_setting('fiscal_speed', self.fiscal_speed_var.get())
            
            # Интеграции
            self.db.set_setting('moysklad_sync', '1' if self.moysklad_sync_var.get() else '0')
            self.db.set_setting('moysklad_token', self.moysklad_token_var.get())
            
            # Резервное копирование
            self.db.set_setting('auto_backup', '1' if self.auto_backup_enabled_var.get() else '0')
            self.db.set_setting('backup_path', self.backup_path_var.get())
            self.db.set_setting('backup_frequency', self.backup_frequency_var.get())
            
            messagebox.showinfo("Успех", "Настройки сохранены")
            self.main_app.status_label.config(text="Настройки сохранены")
            
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка сохранения настроек: {str(e)}")
            
    def reset_settings(self):
        """Сброс настроек к значениям по умолчанию"""
        if messagebox.askyesno("Подтверждение", "Сбросить все настройки к значениям по умолчанию?"):
            # Сброс к значениям по умолчанию
            self.company_name_var.set('Ветеринарная клиника')
            self.company_address_var.set('')
            self.company_inn_var.set('')
            self.currency_var.set('RUB')
            self.tax_rate_var.set('20')
            
            self.printer_name_var.set('')
            self.fiscal_printer_var.set(False)
            self.fiscal_type_var.set('Атол')
            self.fiscal_port_var.set('COM1')
            self.fiscal_speed_var.set('9600')
            
            self.moysklad_sync_var.set(False)
            self.moysklad_token_var.set('')
            
            self.auto_backup_enabled_var.set(False)
            self.backup_path_var.set(os.path.expanduser('~/VetPOS_Backups'))
            self.backup_frequency_var.set('Ежедневно')
            
    def export_settings(self):
        """Экспорт настроек в файл"""
        filename = filedialog.asksaveasfilename(
            title="Экспорт настроек",
            defaultextension=".json",
            filetypes=[("JSON файлы", "*.json"), ("Все файлы", "*.*")]
        )
        
        if filename:
            try:
                # Получение всех настроек
                settings = {}
                all_settings = self.db.fetch_all('SELECT key, value FROM settings')
                
                for setting in all_settings:
                    settings[setting['key']] = setting['value']
                    
                # Сохранение в файл
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(settings, f, ensure_ascii=False, indent=2)
                    
                messagebox.showinfo("Успех", f"Настройки экспортированы в файл:\\n{filename}")
                
            except Exception as e:
                messagebox.showerror("Ошибка", f"Ошибка экспорта: {str(e)}")
                
    def import_settings(self):
        """Импорт настроек из файла"""
        filename = filedialog.askopenfilename(
            title="Импорт настроек",
            filetypes=[("JSON файлы", "*.json"), ("Все файлы", "*.*")]
        )
        
        if filename:
            try:
                # Загрузка из файла
                with open(filename, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                    
                # Применение настроек
                for key, value in settings.items():
                    self.db.set_setting(key, value)
                    
                # Перезагрузка настроек в интерфейс
                self.load_settings()
                
                messagebox.showinfo("Успех", f"Настройки импортированы из файла:\\n{filename}")
                
            except Exception as e:
                messagebox.showerror("Ошибка", f"Ошибка импорта: {str(e)}")
                
    def update_printer_list(self):
        """Обновление списка принтеров"""
        messagebox.showinfo("Принтеры", "Обновление списка принтеров в разработке")
        
    def test_printer(self):
        """Тест печати"""
        printer_name = self.printer_name_var.get()
        if printer_name:
            messagebox.showinfo("Тест печати", f"Тест печати на принтере '{printer_name}' в разработке")
        else:
            messagebox.showwarning("Внимание", "Выберите принтер")
            
    def test_fiscal_printer(self):
        """Тест фискального принтера"""
        if not self.fiscal_printer_var.get():
            messagebox.showwarning("Внимание", "Включите использование фискального принтера")
            return
            
        fiscal_type = self.fiscal_type_var.get()
        port = self.fiscal_port_var.get()
        speed = int(self.fiscal_speed_var.get())
        
        try:
            printer = FiscalPrinter(fiscal_type, port, speed)
            
            if printer.test_connection():
                messagebox.showinfo("Успех", 
                                   f"Соединение с принтером {fiscal_type} на порту {port} установлено!")
            else:
                messagebox.showerror("Ошибка", 
                                   f"Не удалось подключиться к принтеру {fiscal_type} на порту {port}.\\n"
                                   "Проверьте подключение и настройки.")
                
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка подключения к принтеру: {str(e)}")
            
    def test_moysklad_connection(self):
        """Тест соединения с МойСклад"""
        if not self.moysklad_sync_var.get() or not self.moysklad_token_var.get():
            messagebox.showwarning("Внимание", "Включите синхронизацию и введите токен API")
            return
            
        try:
            api = MoySkladAPI(self.moysklad_token_var.get())
            if api.test_connection():
                messagebox.showinfo("Успех", "Соединение с МойСклад установлено успешно!")
            else:
                messagebox.showerror("Ошибка", "Не удалось подключиться к МойСклад. Проверьте токен API.")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка подключения к МойСклад: {str(e)}")
            
    def sync_products(self):
        """Синхронизация товаров с МойСклад"""
        if not self.moysklad_sync_var.get() or not self.moysklad_token_var.get():
            messagebox.showwarning("Внимание", "Сначала настройте соединение с МойСклад")
            return
            
        try:
            api = MoySkladAPI(self.moysklad_token_var.get())
            
            # Получение товаров из МойСклад
            products = api.get_products(50)  # Ограничиваем 50 товарами для теста
            
            if products:
                # Добавление товаров в локальную базу
                added_count = 0
                for product in products:
                    try:
                        # Конвертация данных МойСклад в локальный формат
                        name = product.get("name", "Товар без названия")
                        description = product.get("description", "")
                        
                        # Цена (из копеек в рубли)
                        price = 0
                        sale_prices = product.get("salePrices", [])
                        if sale_prices:
                            price = sale_prices[0].get("value", 0) / 100
                            
                        barcode = product.get("code", "")
                        
                        # Добавление в локальную базу
                        self.db.add_product((
                            barcode, name, description, price, 0, "Из МойСклад", "шт", 0, 0
                        ))
                        added_count += 1
                        
                    except Exception as e:
                        print(f"Ошибка добавления товара {product.get('name', '')}: {e}")
                        continue
                        
                messagebox.showinfo("Синхронизация", 
                                   f"Синхронизация завершена!\\nДобавлено товаров: {added_count}")
            else:
                messagebox.showwarning("Внимание", "Товары в МойСклад не найдены")
                
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка синхронизации: {str(e)}")
        
    def test_yookassa(self):
        """Тест YooKassa"""
        if not (self.yookassa_enabled_var.get() and 
                self.yookassa_shop_id_var.get() and 
                self.yookassa_secret_var.get()):
            messagebox.showwarning("Внимание", "Включите YooKassa и введите Shop ID и Secret Key")
            return
            
        try:
            yookassa = YooKassaPayments(
                self.yookassa_shop_id_var.get(),
                self.yookassa_secret_var.get()
            )
            
            if yookassa.test_connection():
                messagebox.showinfo("Успех", "Соединение с YooKassa установлено успешно!")
            else:
                messagebox.showerror("Ошибка", "Не удалось подключиться к YooKassa. Проверьте Shop ID и Secret Key.")
                
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка подключения к YooKassa: {str(e)}")
            
    def select_backup_folder(self):
        """Выбор папки для резервных копий"""
        folder = filedialog.askdirectory(title="Выберите папку для резервных копий")
        if folder:
            self.backup_path_var.set(folder)
            
    def get_db_size(self):
        """Получение размера базы данных"""
        try:
            size = os.path.getsize(self.db.db_path)
            if size < 1024:
                return f"{size} байт"
            elif size < 1024 * 1024:
                return f"{size / 1024:.1f} КБ"
            else:
                return f"{size / (1024 * 1024):.1f} МБ"
        except:
            return "Неизвестно"
            
    def create_backup(self):
        """Создание резервной копии"""
        backup_path = self.backup_path_var.get()
        if not backup_path:
            messagebox.showwarning("Внимание", "Выберите папку для резервных копий")
            return
            
        try:
            backup_manager = BackupManager(self.db.db_path)
            backup_filepath = backup_manager.create_backup(backup_path)
            
            if backup_filepath:
                messagebox.showinfo("Успех", f"Резервная копия создана:\\n{backup_filepath}")
                self.load_backup_history()
            else:
                messagebox.showerror("Ошибка", "Не удалось создать резервную копию")
            
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка создания резервной копии: {str(e)}")
            
    def restore_backup(self):
        """Восстановление из резервной копии"""
        backup_file = filedialog.askopenfilename(
            title="Выберите файл резервной копии",
            filetypes=[("DB файлы", "*.db"), ("Все файлы", "*.*")]
        )
        
        if backup_file:
            if messagebox.askyesno("Подтверждение", 
                                  "Восстановление из резервной копии заменит текущие данные.\\n\\n"
                                  "Вы уверены, что хотите продолжить?"):
                try:
                    backup_manager = BackupManager(self.db.db_path)
                    
                    if backup_manager.restore_backup(backup_file):
                        # Переподключение к базе данных
                        self.db.close()
                        self.db.__init__(self.db.db_path)
                        
                        messagebox.showinfo("Успех", "Данные восстановлены из резервной копии")
                        
                        # Перезагрузка данных в интерфейсе
                        self.load_settings()
                    else:
                        messagebox.showerror("Ошибка", "Не удалось восстановить данные из резервной копии")
                    
                except Exception as e:
                    messagebox.showerror("Ошибка", f"Ошибка восстановления: {str(e)}")
                    
    def load_backup_history(self):
        """Загрузка истории резервных копий"""
        # Очистка таблицы
        for item in self.backup_tree.get_children():
            self.backup_tree.delete(item)
            
        backup_path = self.backup_path_var.get()
        if not backup_path or not os.path.exists(backup_path):
            return
            
        try:
            # Поиск файлов резервных копий
            for filename in os.listdir(backup_path):
                if filename.startswith('vetpos_backup_') and filename.endswith('.db'):
                    filepath = os.path.join(backup_path, filename)
                    
                    # Информация о файле
                    stat = os.stat(filepath)
                    size = stat.st_size
                    mtime = datetime.fromtimestamp(stat.st_mtime)
                    
                    # Форматирование размера
                    if size < 1024 * 1024:
                        size_str = f"{size / 1024:.1f} КБ"
                    else:
                        size_str = f"{size / (1024 * 1024):.1f} МБ"
                        
                    self.backup_tree.insert('', 'end', values=(
                        mtime.strftime('%d.%m.%Y %H:%M'),
                        size_str,
                        filepath
                    ))
                    
        except Exception as e:
            print(f"Ошибка загрузки истории резервных копий: {e}")