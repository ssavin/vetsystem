"""
Главное приложение кассовой системы VetPOS
Аналог программы "Мой Склад" для Windows
"""

import tkinter as tk
from tkinter import ttk, messagebox
import sqlite3
import os
from datetime import datetime
import json

from database import DatabaseManager
from modules.products import ProductsModule
from modules.sales import SalesModule
from modules.customers import CustomersModule
from modules.reports import ReportsModule
from modules.shifts import ShiftsModule
from modules.settings import SettingsModule


class VetPOSApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("VetPOS - Кассовая система")
        self.root.geometry("1400x800")
        self.root.state('zoomed')  # Максимизировать окно
        
        # Инициализация базы данных
        self.db = DatabaseManager()
        
        # Текущий пользователь и смена
        self.current_user = None
        self.current_shift = None
        
        # Настройка интерфейса
        self.setup_styles()
        self.create_main_interface()
        
        # Проверка авторизации при запуске
        self.login_window()
        
    def setup_styles(self):
        """Настройка стилей интерфейса"""
        style = ttk.Style()
        
        # Тема в стиле современных кассовых программ
        style.theme_use('clam')
        
        # Цвета в стиле "Мой Склад"
        style.configure('Header.TLabel', 
                       font=('Segoe UI', 14, 'bold'),
                       background='#2E7D32',
                       foreground='white')
        
        style.configure('Title.TLabel',
                       font=('Segoe UI', 12, 'bold'))
        
        style.configure('Status.TLabel',
                       font=('Segoe UI', 10),
                       background='#E3F2FD')
        
        # Стили для кнопок
        style.configure('Action.TButton',
                       font=('Segoe UI', 11, 'bold'),
                       padding=(20, 10))
        
        style.configure('Menu.TButton',
                       font=('Segoe UI', 10),
                       padding=(15, 8))
        
    def create_main_interface(self):
        """Создание основного интерфейса"""
        # Главное меню
        self.create_menu_bar()
        
        # Верхняя панель с информацией
        self.create_header_panel()
        
        # Статусная строка (создаём раньше, так как модули обращаются к ней)
        self.create_status_bar()
        
        # Боковая панель навигации
        self.create_sidebar()
        
        # Основная рабочая область
        self.create_main_area()
        
    def create_menu_bar(self):
        """Создание строки меню"""
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)
        
        # Меню "Файл"
        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Файл", menu=file_menu)
        file_menu.add_command(label="Новая смена", command=self.open_new_shift)
        file_menu.add_command(label="Закрыть смену", command=self.close_shift)
        file_menu.add_separator()
        file_menu.add_command(label="Настройки", command=self.open_settings)
        file_menu.add_separator()
        file_menu.add_command(label="Выход", command=self.exit_app)
        
        # Меню "Операции"
        operations_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Операции", menu=operations_menu)
        operations_menu.add_command(label="Продажа", command=self.open_sales)
        operations_menu.add_command(label="Возврат", command=self.open_returns)
        operations_menu.add_command(label="Внесение в кассу", command=self.cash_in)
        operations_menu.add_command(label="Изъятие из кассы", command=self.cash_out)
        
        # Меню "Товары"
        products_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Товары", menu=products_menu)
        products_menu.add_command(label="Каталог товаров", command=self.open_products)
        products_menu.add_command(label="Остатки", command=self.open_inventory)
        products_menu.add_command(label="Приход товаров", command=self.open_receiving)
        
        # Меню "Клиенты"
        customers_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Клиенты", menu=customers_menu)
        customers_menu.add_command(label="База клиентов", command=self.open_customers)
        customers_menu.add_command(label="Скидки и бонусы", command=self.open_discounts)
        
        # Меню "Отчёты"
        reports_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Отчёты", menu=reports_menu)
        reports_menu.add_command(label="Отчёт по продажам", command=self.sales_report)
        reports_menu.add_command(label="X-отчёт", command=self.x_report)
        reports_menu.add_command(label="Z-отчёт", command=self.z_report)
        
        # Меню "Помощь"
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Помощь", menu=help_menu)
        help_menu.add_command(label="О программе", command=self.about)
        
    def create_header_panel(self):
        """Создание верхней панели с информацией"""
        header_frame = ttk.Frame(self.root)
        header_frame.pack(fill=tk.X, padx=5, pady=2)
        
        # Логотип и название
        title_label = ttk.Label(header_frame, text="VetPOS - Кассовая система", 
                               style='Header.TLabel')
        title_label.pack(side=tk.LEFT, padx=10, pady=5)
        
        # Информация о текущем пользователе и смене
        self.user_info_frame = ttk.Frame(header_frame)
        self.user_info_frame.pack(side=tk.RIGHT, padx=10, pady=5)
        
        self.user_label = ttk.Label(self.user_info_frame, text="Не авторизован")
        self.user_label.pack(anchor=tk.E)
        
        self.shift_label = ttk.Label(self.user_info_frame, text="Смена не открыта")
        self.shift_label.pack(anchor=tk.E)
        
        self.time_label = ttk.Label(self.user_info_frame, text="")
        self.time_label.pack(anchor=tk.E)
        
        # Обновление времени
        self.update_time()
        
    def create_sidebar(self):
        """Создание боковой панели навигации"""
        sidebar_frame = ttk.Frame(self.root, width=200)
        sidebar_frame.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)
        sidebar_frame.pack_propagate(False)
        
        # Заголовок
        ttk.Label(sidebar_frame, text="Быстрый доступ", 
                 style='Title.TLabel').pack(pady=10)
        
        # Кнопки быстрого доступа
        buttons = [
            ("💰 Продажа", self.open_sales),
            ("📦 Товары", self.open_products),
            ("👥 Клиенты", self.open_customers),
            ("📊 Отчёты", self.open_reports),
            ("⚙️ Настройки", self.open_settings),
        ]
        
        for text, command in buttons:
            btn = ttk.Button(sidebar_frame, text=text, command=command,
                           style='Menu.TButton')
            btn.pack(fill=tk.X, padx=5, pady=2)
        
        # Информация о кассе
        ttk.Separator(sidebar_frame, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)
        
        self.cash_info_frame = ttk.LabelFrame(sidebar_frame, text="Касса")
        self.cash_info_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.cash_amount_label = ttk.Label(self.cash_info_frame, text="0.00 ₽")
        self.cash_amount_label.pack(pady=5)
        
    def create_main_area(self):
        """Создание основной рабочей области"""
        self.main_frame = ttk.Frame(self.root)
        self.main_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Вкладки для разных модулей
        self.notebook = ttk.Notebook(self.main_frame)
        self.notebook.pack(fill=tk.BOTH, expand=True)
        
        # Создание модулей
        self.modules = {}
        self.create_modules()
        
    def create_status_bar(self):
        """Создание статусной строки"""
        self.status_frame = ttk.Frame(self.root)
        self.status_frame.pack(side=tk.BOTTOM, fill=tk.X)
        
        self.status_label = ttk.Label(self.status_frame, text="Готов к работе",
                                     style='Status.TLabel')
        self.status_label.pack(side=tk.LEFT, padx=5, pady=2)
        
        # Индикатор подключения
        self.connection_label = ttk.Label(self.status_frame, text="● База данных",
                                         style='Status.TLabel')
        self.connection_label.pack(side=tk.RIGHT, padx=5, pady=2)
        
    def create_modules(self):
        """Создание модулей приложения"""
        # Модуль продаж
        self.modules['sales'] = SalesModule(self.notebook, self.db, self)
        self.notebook.add(self.modules['sales'].frame, text="Продажи")
        
        # Модуль товаров
        self.modules['products'] = ProductsModule(self.notebook, self.db, self)
        self.notebook.add(self.modules['products'].frame, text="Товары")
        
        # Модуль клиентов
        self.modules['customers'] = CustomersModule(self.notebook, self.db, self)
        self.notebook.add(self.modules['customers'].frame, text="Клиенты")
        
        # Модуль отчётов
        self.modules['reports'] = ReportsModule(self.notebook, self.db, self)
        self.notebook.add(self.modules['reports'].frame, text="Отчёты")
        
    def login_window(self):
        """Окно авторизации"""
        login_win = tk.Toplevel(self.root)
        login_win.title("Вход в систему")
        login_win.geometry("400x300")
        login_win.transient(self.root)
        login_win.grab_set()
        
        # Центрирование окна
        login_win.geometry("+%d+%d" % (
            self.root.winfo_rootx() + 500,
            self.root.winfo_rooty() + 200
        ))
        
        # Заголовок
        ttk.Label(login_win, text="VetPOS", 
                 font=('Segoe UI', 18, 'bold')).pack(pady=20)
        
        # Поля ввода
        login_frame = ttk.Frame(login_win)
        login_frame.pack(pady=20)
        
        ttk.Label(login_frame, text="Логин:").grid(row=0, column=0, padx=5, pady=5, sticky=tk.W)
        username_entry = ttk.Entry(login_frame, width=20)
        username_entry.grid(row=0, column=1, padx=5, pady=5)
        username_entry.insert(0, "admin")  # По умолчанию
        
        ttk.Label(login_frame, text="Пароль:").grid(row=1, column=0, padx=5, pady=5, sticky=tk.W)
        password_entry = ttk.Entry(login_frame, width=20, show="*")
        password_entry.grid(row=1, column=1, padx=5, pady=5)
        password_entry.insert(0, "admin")  # По умолчанию
        
        def login():
            username = username_entry.get()
            password = password_entry.get()
            
            if not username or not password:
                messagebox.showerror("Ошибка", "Введите логин и пароль")
                return
                
            # Проверка пароля с хешированием
            user = self.db.get_user_by_username(username)
            if user and self.db.verify_password(username, password):
                self.current_user = {
                    'username': user['username'],
                    'name': user['name'],
                    'role': user['role']
                }
                self.update_user_info()
                login_win.destroy()
                self.status_label.config(text=f"Вход выполнен: {username}")
            else:
                messagebox.showerror("Ошибка", "Неверный логин или пароль")
        
        # Кнопки
        btn_frame = ttk.Frame(login_win)
        btn_frame.pack(pady=20)
        
        ttk.Button(btn_frame, text="Войти", command=login,
                  style='Action.TButton').pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_frame, text="Отмена", command=self.exit_app,
                  style='Action.TButton').pack(side=tk.LEFT, padx=10)
        
        # Фокус на поле пароля и Enter для входа
        password_entry.focus()
        login_win.bind('<Return>', lambda e: login())
        
    def update_user_info(self):
        """Обновление информации о пользователе"""
        if self.current_user:
            self.user_label.config(text=f"Пользователь: {self.current_user['name']}")
        
        if self.current_shift:
            self.shift_label.config(text=f"Смена: {self.current_shift['id']} (открыта)")
        else:
            self.shift_label.config(text="Смена не открыта")
            
    def update_time(self):
        """Обновление времени"""
        current_time = datetime.now().strftime("%H:%M:%S")
        self.time_label.config(text=current_time)
        self.root.after(1000, self.update_time)
        
    # Обработчики меню и кнопок
    def open_sales(self):
        """Открыть модуль продаж"""
        self.notebook.select(0)
        
    def open_products(self):
        """Открыть модуль товаров"""
        self.notebook.select(1)
        
    def open_customers(self):
        """Открыть модуль клиентов"""
        self.notebook.select(2)
        
    def open_reports(self):
        """Открыть модуль отчётов"""
        self.notebook.select(3)
        
    def open_settings(self):
        """Открыть настройки"""
        if 'settings' not in self.modules:
            self.modules['settings'] = SettingsModule(self.notebook, self.db, self)
            self.notebook.add(self.modules['settings'].frame, text="Настройки")
        
        # Найти и выбрать вкладку настроек
        for i in range(self.notebook.index('end')):
            if self.notebook.tab(i, 'text') == 'Настройки':
                self.notebook.select(i)
                break
                
    def open_new_shift(self):
        """Открытие новой смены"""
        if self.current_shift:
            messagebox.showwarning("Внимание", "Сначала закройте текущую смену")
            return
            
        # Диалог открытия смены
        shift_win = tk.Toplevel(self.root)
        shift_win.title("Открытие смены")
        shift_win.geometry("400x200")
        shift_win.transient(self.root)
        shift_win.grab_set()
        
        ttk.Label(shift_win, text="Сумма в кассе на начало смены:").pack(pady=10)
        amount_var = tk.StringVar(value="0.00")
        amount_entry = ttk.Entry(shift_win, textvariable=amount_var, width=15)
        amount_entry.pack(pady=5)
        
        def confirm_open():
            try:
                amount = float(amount_var.get())
                shift_id = datetime.now().strftime("%Y%m%d_%H%M%S")
                self.current_shift = {
                    'id': shift_id,
                    'start_time': datetime.now(),
                    'start_amount': amount,
                    'current_amount': amount
                }
                
                # Сохранение в БД
                self.db.open_shift(self.current_user['username'], amount)
                
                self.update_user_info()
                self.cash_amount_label.config(text=f"{amount:.2f} ₽")
                shift_win.destroy()
                self.status_label.config(text="Смена открыта")
                
            except ValueError:
                messagebox.showerror("Ошибка", "Введите корректную сумму")
        
        ttk.Button(shift_win, text="Открыть смену", 
                  command=confirm_open).pack(pady=10)
        
    def close_shift(self):
        """Закрытие смены"""
        if not self.current_shift:
            messagebox.showwarning("Внимание", "Смена не открыта")
            return
            
        # Z-отчёт и закрытие
        messagebox.showinfo("Закрытие смены", "Будет сформирован Z-отчёт")
        self.current_shift = None
        self.update_user_info()
        self.status_label.config(text="Смена закрыта")
        
    def cash_in(self):
        """Внесение наличных в кассу"""
        messagebox.showinfo("Внесение", "Функция в разработке")
        
    def cash_out(self):
        """Изъятие наличных из кассы"""
        messagebox.showinfo("Изъятие", "Функция в разработке")
        
    def open_inventory(self):
        """Остатки товаров"""
        messagebox.showinfo("Остатки", "Функция в разработке")
        
    def open_receiving(self):
        """Приход товаров"""
        messagebox.showinfo("Приход", "Функция в разработке")
        
    def open_discounts(self):
        """Скидки и бонусы"""
        messagebox.showinfo("Скидки", "Функция в разработке")
        
    def open_returns(self):
        """Возвраты"""
        messagebox.showinfo("Возвраты", "Функция в разработке")
        
    def sales_report(self):
        """Отчёт по продажам"""
        messagebox.showinfo("Отчёт", "Функция в разработке")
        
    def x_report(self):
        """X-отчёт"""
        messagebox.showinfo("X-отчёт", "Функция в разработке")
        
    def z_report(self):
        """Z-отчёт"""
        messagebox.showinfo("Z-отчёт", "Функция в разработке")
        
    def about(self):
        """О программе"""
        messagebox.showinfo("О программе", 
                           "VetPOS v1.0\nКассовая система\nАналог 'Мой Склад'")
        
    def exit_app(self):
        """Выход из приложения"""
        if messagebox.askquestion("Выход", "Вы действительно хотите выйти?") == 'yes':
            self.root.quit()
            
    def run(self):
        """Запуск приложения"""
        self.root.mainloop()


if __name__ == "__main__":
    app = VetPOSApp()
    app.run()