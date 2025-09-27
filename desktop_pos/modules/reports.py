"""
Модуль отчётности
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.dates as mdates


class ReportsModule:
    def __init__(self, parent, db, main_app):
        self.parent = parent
        self.db = db
        self.main_app = main_app
        
        self.frame = ttk.Frame(parent)
        self.create_interface()
        
    def create_interface(self):
        """Создание интерфейса модуля отчётов"""
        # Панель выбора отчёта
        control_frame = ttk.LabelFrame(self.frame, text="Выбор отчёта")
        control_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Тип отчёта
        ttk.Label(control_frame, text="Тип отчёта:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        
        self.report_type_var = tk.StringVar(value="sales")
        report_combo = ttk.Combobox(control_frame, textvariable=self.report_type_var, 
                                   values=[
                                       ("sales", "Отчёт по продажам"),
                                       ("products", "Отчёт по товарам"),
                                       ("customers", "Отчёт по клиентам"),
                                       ("shifts", "Отчёт по сменам"),
                                       ("cash", "Кассовый отчёт"),
                                       ("profit", "Отчёт по прибыли")
                                   ], state="readonly", width=30)
        report_combo.grid(row=0, column=1, padx=5, pady=5)
        
        # Период
        ttk.Label(control_frame, text="Период:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        
        period_frame = ttk.Frame(control_frame)
        period_frame.grid(row=1, column=1, sticky=tk.W, padx=5, pady=5)
        
        # Дата от
        ttk.Label(period_frame, text="с:").pack(side=tk.LEFT)
        self.date_from_var = tk.StringVar(value=datetime.now().strftime("%Y-%m-%d"))
        ttk.Entry(period_frame, textvariable=self.date_from_var, width=12).pack(side=tk.LEFT, padx=2)
        
        # Дата до
        ttk.Label(period_frame, text="по:").pack(side=tk.LEFT, padx=(10, 0))
        self.date_to_var = tk.StringVar(value=datetime.now().strftime("%Y-%m-%d"))
        ttk.Entry(period_frame, textvariable=self.date_to_var, width=12).pack(side=tk.LEFT, padx=2)
        
        # Быстрый выбор периода
        quick_frame = ttk.Frame(control_frame)
        quick_frame.grid(row=2, column=0, columnspan=2, sticky=tk.W, padx=5, pady=5)
        
        ttk.Button(quick_frame, text="Сегодня", 
                  command=lambda: self.set_period(0)).pack(side=tk.LEFT, padx=2)
        ttk.Button(quick_frame, text="Вчера", 
                  command=lambda: self.set_period(-1)).pack(side=tk.LEFT, padx=2)
        ttk.Button(quick_frame, text="7 дней", 
                  command=lambda: self.set_period(-7)).pack(side=tk.LEFT, padx=2)
        ttk.Button(quick_frame, text="Месяц", 
                  command=lambda: self.set_period(-30)).pack(side=tk.LEFT, padx=2)
        
        # Кнопка формирования отчёта
        ttk.Button(control_frame, text="Сформировать отчёт", 
                  command=self.generate_report).grid(row=3, column=0, columnspan=2, pady=10)
        
        # Область отчёта
        self.create_report_area()
        
    def create_report_area(self):
        """Создание области отображения отчёта"""
        # Notebook для разных представлений
        self.report_notebook = ttk.Notebook(self.frame)
        self.report_notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Табличное представление
        self.create_table_view()
        
        # Графическое представление
        self.create_chart_view()
        
        # Сводка
        self.create_summary_view()
        
    def create_table_view(self):
        """Табличное представление отчёта"""
        table_frame = ttk.Frame(self.report_notebook)
        self.report_notebook.add(table_frame, text="Таблица")
        
        # Таблица отчёта
        self.report_tree = ttk.Treeview(table_frame, show='headings', height=15)
        
        # Прокрутка
        table_scrollbar_v = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.report_tree.yview)
        table_scrollbar_h = ttk.Scrollbar(table_frame, orient=tk.HORIZONTAL, command=self.report_tree.xview)
        self.report_tree.configure(yscrollcommand=table_scrollbar_v.set, xscrollcommand=table_scrollbar_h.set)
        
        # Размещение
        self.report_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        table_scrollbar_v.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Кнопки экспорта
        export_frame = ttk.Frame(table_frame)
        export_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(export_frame, text="Экспорт в Excel", 
                  command=self.export_excel).pack(side=tk.LEFT, padx=5)
        ttk.Button(export_frame, text="Печать", 
                  command=self.print_report).pack(side=tk.LEFT, padx=5)
        
    def create_chart_view(self):
        """Графическое представление отчёта"""
        chart_frame = ttk.Frame(self.report_notebook)
        self.report_notebook.add(chart_frame, text="График")
        
        # Контейнер для графика
        self.chart_container = ttk.Frame(chart_frame)
        self.chart_container.pack(fill=tk.BOTH, expand=True)
        
        # Изначально пустая область
        ttk.Label(self.chart_container, text="Выберите отчёт для отображения графика", 
                 font=('Segoe UI', 12)).pack(expand=True)
        
    def create_summary_view(self):
        """Сводка по отчёту"""
        summary_frame = ttk.Frame(self.report_notebook)
        self.report_notebook.add(summary_frame, text="Сводка")
        
        # Ключевые показатели
        metrics_frame = ttk.LabelFrame(summary_frame, text="Ключевые показатели")
        metrics_frame.pack(fill=tk.X, padx=10, pady=10)
        
        self.metrics_labels = {}
        metrics = [
            ('total_sales', 'Общая сумма продаж:', '0.00 ₽'),
            ('total_transactions', 'Количество операций:', '0'),
            ('avg_check', 'Средний чек:', '0.00 ₽'),
            ('total_customers', 'Уникальных клиентов:', '0'),
            ('total_profit', 'Прибыль:', '0.00 ₽'),
            ('margin', 'Маржинальность:', '0.0%')
        ]
        
        for i, (key, label, default) in enumerate(metrics):
            row = i // 2
            col = (i % 2) * 2
            
            ttk.Label(metrics_frame, text=label).grid(row=row, column=col, sticky=tk.W, padx=5, pady=5)
            value_label = ttk.Label(metrics_frame, text=default, font=('Segoe UI', 10, 'bold'))
            value_label.grid(row=row, column=col+1, sticky=tk.W, padx=15, pady=5)
            self.metrics_labels[key] = value_label
            
        # Детальная информация
        details_frame = ttk.LabelFrame(summary_frame, text="Детализация")
        details_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        self.details_text = tk.Text(details_frame, wrap=tk.WORD, height=10)
        details_scrollbar = ttk.Scrollbar(details_frame, orient=tk.VERTICAL, command=self.details_text.yview)
        self.details_text.configure(yscrollcommand=details_scrollbar.set)
        
        self.details_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        details_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
    def set_period(self, days_offset):
        """Установка периода отчёта"""
        if days_offset == 0:
            # Сегодня
            date = datetime.now()
            self.date_from_var.set(date.strftime("%Y-%m-%d"))
            self.date_to_var.set(date.strftime("%Y-%m-%d"))
        elif days_offset == -1:
            # Вчера
            date = datetime.now() - timedelta(days=1)
            self.date_from_var.set(date.strftime("%Y-%m-%d"))
            self.date_to_var.set(date.strftime("%Y-%m-%d"))
        else:
            # Период назад
            date_to = datetime.now()
            date_from = date_to + timedelta(days=days_offset)
            self.date_from_var.set(date_from.strftime("%Y-%m-%d"))
            self.date_to_var.set(date_to.strftime("%Y-%m-%d"))
            
    def generate_report(self):
        """Формирование отчёта"""
        report_type = self.report_type_var.get()
        date_from = self.date_from_var.get()
        date_to = self.date_to_var.get()
        
        try:
            # Валидация дат
            datetime.strptime(date_from, "%Y-%m-%d")
            datetime.strptime(date_to, "%Y-%m-%d")
        except ValueError:
            messagebox.showerror("Ошибка", "Неверный формат даты. Используйте YYYY-MM-DD")
            return
            
        if report_type == "sales":
            self.generate_sales_report(date_from, date_to)
        elif report_type == "products":
            self.generate_products_report(date_from, date_to)
        elif report_type == "customers":
            self.generate_customers_report(date_from, date_to)
        elif report_type == "shifts":
            self.generate_shifts_report(date_from, date_to)
        elif report_type == "cash":
            self.generate_cash_report(date_from, date_to)
        elif report_type == "profit":
            self.generate_profit_report(date_from, date_to)
            
    def generate_sales_report(self, date_from, date_to):
        """Отчёт по продажам"""
        # Настройка колонок таблицы
        columns = ('Дата', 'Чек №', 'Клиент', 'Сумма', 'Скидка', 'Итого', 'Способ оплаты', 'Кассир')
        self.report_tree['columns'] = columns
        
        # Очистка таблицы
        for item in self.report_tree.get_children():
            self.report_tree.delete(item)
            
        # Настройка заголовков
        for col in columns:
            self.report_tree.heading(col, text=col)
            self.report_tree.column(col, width=100)
            
        # Получение данных
        sales_data = self.db.fetch_all('''
            SELECT s.created_at, s.id, c.name as customer_name, 
                   s.total_amount, s.discount_amount, s.final_amount, 
                   s.payment_method, u.name as cashier_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            JOIN shifts sh ON s.shift_id = sh.id
            JOIN users u ON sh.cashier_id = u.id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
            ORDER BY s.created_at DESC
        ''', (date_from, date_to))
        
        total_sales = 0
        total_discount = 0
        
        for sale in sales_data:
            # Форматирование даты
            try:
                date_obj = datetime.strptime(sale['created_at'], '%Y-%m-%d %H:%M:%S')
                formatted_date = date_obj.strftime('%d.%m.%Y %H:%M')
            except:
                formatted_date = sale['created_at']
                
            self.report_tree.insert('', 'end', values=(
                formatted_date,
                sale['id'],
                sale['customer_name'] or 'Без клиента',
                f"{sale['total_amount']:.2f} ₽",
                f"{sale['discount_amount']:.2f} ₽",
                f"{sale['final_amount']:.2f} ₽",
                sale['payment_method'],
                sale['cashier_name']
            ))
            
            total_sales += sale['final_amount']
            total_discount += sale['discount_amount']
            
        # Обновление метрик
        self.metrics_labels['total_sales'].config(text=f"{total_sales:.2f} ₽")
        self.metrics_labels['total_transactions'].config(text=str(len(sales_data)))
        
        if len(sales_data) > 0:
            avg_check = total_sales / len(sales_data)
            self.metrics_labels['avg_check'].config(text=f"{avg_check:.2f} ₽")
        else:
            self.metrics_labels['avg_check'].config(text="0.00 ₽")
            
        # Обновление деталей
        self.details_text.delete(1.0, tk.END)
        self.details_text.insert(tk.END, f"Отчёт по продажам за период с {date_from} по {date_to}\\n\\n")
        self.details_text.insert(tk.END, f"Всего операций: {len(sales_data)}\\n")
        self.details_text.insert(tk.END, f"Общая сумма: {total_sales:.2f} ₽\\n")
        self.details_text.insert(tk.END, f"Общая скидка: {total_discount:.2f} ₽\\n")
        
        if len(sales_data) > 0:
            self.details_text.insert(tk.END, f"Средний чек: {avg_check:.2f} ₽\\n")
            
        # Создание графика
        self.create_sales_chart(sales_data)
        
        self.main_app.status_label.config(text=f"Сформирован отчёт по продажам: {len(sales_data)} записей")
        
    def create_sales_chart(self, sales_data):
        """Создание графика продаж"""
        # Очистка контейнера
        for widget in self.chart_container.winfo_children():
            widget.destroy()
            
        if not sales_data:
            ttk.Label(self.chart_container, text="Нет данных для отображения графика").pack(expand=True)
            return
            
        # Группировка по дням
        daily_sales = {}
        for sale in sales_data:
            try:
                date_obj = datetime.strptime(sale['created_at'], '%Y-%m-%d %H:%M:%S')
                date_key = date_obj.strftime('%Y-%m-%d')
                
                if date_key not in daily_sales:
                    daily_sales[date_key] = 0
                daily_sales[date_key] += sale['final_amount']
            except:
                continue
                
        if not daily_sales:
            ttk.Label(self.chart_container, text="Нет данных для отображения графика").pack(expand=True)
            return
            
        # Создание графика
        fig, ax = plt.subplots(figsize=(10, 6))
        
        dates = [datetime.strptime(date, '%Y-%m-%d') for date in sorted(daily_sales.keys())]
        amounts = [daily_sales[date.strftime('%Y-%m-%d')] for date in dates]
        
        ax.plot(dates, amounts, marker='o', linewidth=2, markersize=6)
        ax.set_title('Продажи по дням')
        ax.set_xlabel('Дата')
        ax.set_ylabel('Сумма, ₽')
        ax.grid(True, alpha=0.3)
        
        # Форматирование оси дат
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%d.%m'))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=1))
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        
        # Добавление в интерфейс
        canvas = FigureCanvasTkAgg(fig, self.chart_container)
        canvas.draw()
        canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
    def generate_products_report(self, date_from, date_to):
        """Отчёт по товарам"""
        messagebox.showinfo("Отчёт по товарам", "Отчёт по товарам в разработке")
        
    def generate_customers_report(self, date_from, date_to):
        """Отчёт по клиентам"""
        messagebox.showinfo("Отчёт по клиентам", "Отчёт по клиентам в разработке")
        
    def generate_shifts_report(self, date_from, date_to):
        """Отчёт по сменам"""
        messagebox.showinfo("Отчёт по сменам", "Отчёт по сменам в разработке")
        
    def generate_cash_report(self, date_from, date_to):
        """Кассовый отчёт"""
        messagebox.showinfo("Кассовый отчёт", "Кассовый отчёт в разработке")
        
    def generate_profit_report(self, date_from, date_to):
        """Отчёт по прибыли"""
        messagebox.showinfo("Отчёт по прибыли", "Отчёт по прибыли в разработке")
        
    def export_excel(self):
        """Экспорт в Excel"""
        messagebox.showinfo("Экспорт", "Экспорт в Excel в разработке")
        
    def print_report(self):
        """Печать отчёта"""
        messagebox.showinfo("Печать", "Печать отчёта в разработке")