"""
Модуль управления сменами
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime


class ShiftsModule:
    def __init__(self, parent, db, main_app):
        self.parent = parent
        self.db = db
        self.main_app = main_app
        
        self.frame = ttk.Frame(parent)
        self.create_interface()
        self.load_shifts()
        
    def create_interface(self):
        """Создание интерфейса модуля смен"""
        # Панель управления
        control_frame = ttk.Frame(self.frame)
        control_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Информация о текущей смене
        current_frame = ttk.LabelFrame(control_frame, text="Текущая смена")
        current_frame.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        
        self.current_shift_info = ttk.Label(current_frame, text="Смена не открыта", 
                                           font=('Segoe UI', 10, 'bold'))
        self.current_shift_info.pack(padx=10, pady=5)
        
        # Кнопки управления сменой
        shift_btn_frame = ttk.Frame(control_frame)
        shift_btn_frame.pack(side=tk.RIGHT, padx=5)
        
        ttk.Button(shift_btn_frame, text="Открыть смену", 
                  command=self.open_shift).pack(side=tk.TOP, pady=2, fill=tk.X)
        ttk.Button(shift_btn_frame, text="Закрыть смену", 
                  command=self.close_shift).pack(side=tk.TOP, pady=2, fill=tk.X)
        ttk.Button(shift_btn_frame, text="X-отчёт", 
                  command=self.x_report).pack(side=tk.TOP, pady=2, fill=tk.X)
        ttk.Button(shift_btn_frame, text="Z-отчёт", 
                  command=self.z_report).pack(side=tk.TOP, pady=2, fill=tk.X)
        
        # Таблица смен
        self.create_shifts_table()
        
        # Панель детальной информации
        self.create_shift_details_panel()
        
        # Обновление информации о текущей смене
        self.update_current_shift_info()
        
    def create_shifts_table(self):
        """Создание таблицы смен"""
        table_frame = ttk.LabelFrame(self.frame, text="История смен")
        table_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Создание Treeview
        columns = ('ID', 'Кассир', 'Дата открытия', 'Дата закрытия', 'Начальная сумма', 
                  'Конечная сумма', 'Продажи', 'Операций', 'Статус')
        
        self.shifts_tree = ttk.Treeview(table_frame, columns=columns, show='headings', height=10)
        
        # Настройка колонок
        column_widths = [50, 120, 130, 130, 100, 100, 100, 80, 80]
        for i, (col, width) in enumerate(zip(columns, column_widths)):
            self.shifts_tree.heading(col, text=col)
            self.shifts_tree.column(col, width=width, minwidth=width//2)
        
        # Прокрутка
        scrollbar_v = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.shifts_tree.yview)
        scrollbar_h = ttk.Scrollbar(table_frame, orient=tk.HORIZONTAL, command=self.shifts_tree.xview)
        self.shifts_tree.configure(yscrollcommand=scrollbar_v.set, xscrollcommand=scrollbar_h.set)
        
        # Размещение
        self.shifts_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar_v.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Обработчики
        self.shifts_tree.bind('<<TreeviewSelect>>', self.on_shift_select)
        
    def create_shift_details_panel(self):
        """Панель детальной информации о смене"""
        details_frame = ttk.LabelFrame(self.frame, text="Детали смены")
        details_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Основная информация
        info_frame = ttk.Frame(details_frame)
        info_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        self.detail_labels = {}
        details = [
            ('cashier', 'Кассир:'),
            ('start_time', 'Время открытия:'),
            ('end_time', 'Время закрытия:'),
            ('duration', 'Продолжительность:'),
            ('start_amount', 'Начальная сумма:'),
            ('end_amount', 'Конечная сумма:'),
            ('total_sales', 'Общие продажи:'),
            ('cash_sales', 'Продажи наличными:'),
            ('card_sales', 'Продажи картой:'),
            ('transactions_count', 'Количество операций:')
        ]
        
        for i, (key, label) in enumerate(details):
            row = i // 2
            col = (i % 2) * 2
            
            ttk.Label(info_frame, text=label).grid(row=row, column=col, sticky=tk.W, padx=5, pady=2)
            value_label = ttk.Label(info_frame, text="-", foreground='blue')
            value_label.grid(row=row, column=col+1, sticky=tk.W, padx=10, pady=2)
            self.detail_labels[key] = value_label
            
        # Кнопки действий
        actions_frame = ttk.Frame(details_frame)
        actions_frame.pack(side=tk.RIGHT, padx=10, pady=10)
        
        ttk.Button(actions_frame, text="Печать Z-отчёта", 
                  command=self.print_z_report).pack(fill=tk.X, pady=2)
        ttk.Button(actions_frame, text="Детальный отчёт", 
                  command=self.detailed_report).pack(fill=tk.X, pady=2)
        ttk.Button(actions_frame, text="Продажи смены", 
                  command=self.show_shift_sales).pack(fill=tk.X, pady=2)
        
    def load_shifts(self):
        """Загрузка смен в таблицу"""
        # Очистка таблицы
        for item in self.shifts_tree.get_children():
            self.shifts_tree.delete(item)
            
        # Загрузка данных
        shifts = self.db.fetch_all('''
            SELECT s.*, u.name as cashier_name
            FROM shifts s
            JOIN users u ON s.cashier_id = u.id
            ORDER BY s.start_time DESC
            LIMIT 50
        ''')
        
        for shift in shifts:
            # Форматирование времени
            try:
                start_time = datetime.strptime(shift['start_time'], '%Y-%m-%d %H:%M:%S')
                formatted_start = start_time.strftime('%d.%m.%Y %H:%M')
            except:
                formatted_start = shift['start_time']
                
            if shift['end_time']:
                try:
                    end_time = datetime.strptime(shift['end_time'], '%Y-%m-%d %H:%M:%S')
                    formatted_end = end_time.strftime('%d.%m.%Y %H:%M')
                except:
                    formatted_end = shift['end_time']
            else:
                formatted_end = "Открыта"
                
            # Статус
            status = "Открыта" if shift['status'] == 'open' else "Закрыта"
            
            self.shifts_tree.insert('', 'end', values=(
                shift['id'],
                shift['cashier_name'],
                formatted_start,
                formatted_end,
                f"{shift['start_amount']:.2f} ₽",
                f"{shift['end_amount']:.2f} ₽" if shift['end_amount'] else "-",
                f"{shift['total_sales']:.2f} ₽",
                shift['transactions_count'],
                status
            ))
            
        self.main_app.status_label.config(text=f"Загружено смен: {len(shifts)}")
        
    def update_current_shift_info(self):
        """Обновление информации о текущей смене"""
        if self.main_app.current_shift:
            shift = self.main_app.current_shift
            info_text = f"Смена #{shift['id']} - Начало: {shift['start_time'].strftime('%H:%M')}"
            self.current_shift_info.config(text=info_text, foreground='green')
        else:
            self.current_shift_info.config(text="Смена не открыта", foreground='red')
            
    def open_shift(self):
        """Открытие новой смены"""
        if self.main_app.current_shift:
            messagebox.showwarning("Внимание", "Сначала закройте текущую смену")
            return
            
        if not self.main_app.current_user:
            messagebox.showerror("Ошибка", "Необходимо войти в систему")
            return
            
        # Диалог открытия смены
        dialog = ShiftOpenDialog(self.frame, self.db, self.main_app)
        if dialog.result:
            self.load_shifts()
            self.update_current_shift_info()
            
    def close_shift(self):
        """Закрытие текущей смены"""
        if not self.main_app.current_shift:
            messagebox.showwarning("Внимание", "Смена не открыта")
            return
            
        # Подтверждение закрытия
        if messagebox.askyesno("Закрытие смены", 
                              "Вы действительно хотите закрыть смену?\\n\\n"
                              "После закрытия смены будет сформирован Z-отчёт."):
            
            # Диалог закрытия смены
            dialog = ShiftCloseDialog(self.frame, self.db, self.main_app)
            if dialog.result:
                self.main_app.current_shift = None
                self.load_shifts()
                self.update_current_shift_info()
                self.main_app.update_user_info()
                
    def x_report(self):
        """X-отчёт (без закрытия смены)"""
        if not self.main_app.current_shift:
            messagebox.showwarning("Внимание", "Смена не открыта")
            return
            
        # Формирование X-отчёта
        self.generate_x_report()
        
    def z_report(self):
        """Z-отчёт (с закрытием смены)"""
        if not self.main_app.current_shift:
            messagebox.showwarning("Внимание", "Смена не открыта")
            return
            
        messagebox.showinfo("Z-отчёт", "Z-отчёт формируется при закрытии смены")
        
    def generate_x_report(self):
        """Формирование X-отчёта"""
        shift = self.main_app.current_shift
        
        # Получение данных о продажах за смену
        sales_data = self.db.fetch_all('''
            SELECT payment_method, SUM(final_amount) as total, COUNT(*) as count
            FROM sales 
            WHERE shift_id = ?
            GROUP BY payment_method
        ''', (shift['id'],))
        
        # Создание окна отчёта
        report_window = tk.Toplevel(self.frame)
        report_window.title("X-отчёт")
        report_window.geometry("400x500")
        report_window.transient(self.frame)
        
        # Содержимое отчёта
        report_text = tk.Text(report_window, wrap=tk.WORD, font=('Courier New', 10))
        report_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Формирование текста отчёта
        current_time = datetime.now().strftime('%d.%m.%Y %H:%M:%S')
        
        report_content = f"""
=====================================
           X-ОТЧЁТ
=====================================

Дата и время: {current_time}
Кассир: {self.main_app.current_user['name']}
Смена: {shift['id']}
Время открытия: {shift['start_time'].strftime('%d.%m.%Y %H:%M:%S')}

-------------------------------------
          ИТОГИ ПО ОПЛАТАМ
-------------------------------------
"""
        
        total_amount = 0
        total_count = 0
        
        for sale in sales_data:
            report_content += f"{sale['payment_method']:.<20} {sale['total']:>8.2f} ₽ ({sale['count']} чеков)\\n"
            total_amount += sale['total']
            total_count += sale['count']
            
        report_content += f"""
-------------------------------------
ИТОГО:                    {total_amount:>8.2f} ₽
Количество чеков:         {total_count:>8} шт
Средний чек:              {total_amount/total_count if total_count > 0 else 0:>8.2f} ₽

-------------------------------------
           КАССА
-------------------------------------
Сумма на начало смены:    {shift['start_amount']:>8.2f} ₽
Наличные продажи:         {shift.get('current_amount', shift['start_amount']) - shift['start_amount']:>8.2f} ₽
Сумма в кассе:            {shift.get('current_amount', shift['start_amount']):>8.2f} ₽

=====================================
        """
        
        report_text.insert(1.0, report_content)
        report_text.config(state=tk.DISABLED)
        
        # Кнопки
        btn_frame = ttk.Frame(report_window)
        btn_frame.pack(fill=tk.X, padx=10, pady=10)
        
        ttk.Button(btn_frame, text="Печать", 
                  command=lambda: self.print_report(report_content)).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Закрыть", 
                  command=report_window.destroy).pack(side=tk.RIGHT, padx=5)
        
    def on_shift_select(self, event):
        """Обработчик выбора смены"""
        selection = self.shifts_tree.selection()
        if not selection:
            self.clear_shift_details()
            return
            
        item = self.shifts_tree.item(selection[0])
        shift_id = item['values'][0]
        
        # Получение полной информации о смене
        shift = self.db.fetch_one('''
            SELECT s.*, u.name as cashier_name
            FROM shifts s
            JOIN users u ON s.cashier_id = u.id
            WHERE s.id = ?
        ''', (shift_id,))
        
        if shift:
            self.show_shift_details(shift)
            
    def show_shift_details(self, shift):
        """Отображение деталей смены"""
        self.detail_labels['cashier'].config(text=shift['cashier_name'])
        
        # Форматирование времени
        try:
            start_time = datetime.strptime(shift['start_time'], '%Y-%m-%d %H:%M:%S')
            self.detail_labels['start_time'].config(text=start_time.strftime('%d.%m.%Y %H:%M:%S'))
            
            if shift['end_time']:
                end_time = datetime.strptime(shift['end_time'], '%Y-%m-%d %H:%M:%S')
                self.detail_labels['end_time'].config(text=end_time.strftime('%d.%m.%Y %H:%M:%S'))
                
                # Продолжительность
                duration = end_time - start_time
                hours = duration.seconds // 3600
                minutes = (duration.seconds % 3600) // 60
                self.detail_labels['duration'].config(text=f"{hours}ч {minutes}м")
            else:
                self.detail_labels['end_time'].config(text="Смена открыта")
                
                # Текущая продолжительность
                current_time = datetime.now()
                duration = current_time - start_time
                hours = duration.seconds // 3600
                minutes = (duration.seconds % 3600) // 60
                self.detail_labels['duration'].config(text=f"{hours}ч {minutes}м (текущая)")
        except:
            self.detail_labels['start_time'].config(text=shift['start_time'])
            self.detail_labels['end_time'].config(text=shift['end_time'] or "Смена открыта")
            self.detail_labels['duration'].config(text="-")
            
        # Суммы
        self.detail_labels['start_amount'].config(text=f"{shift['start_amount']:.2f} ₽")
        self.detail_labels['end_amount'].config(text=f"{shift['end_amount']:.2f} ₽" if shift['end_amount'] else "-")
        self.detail_labels['total_sales'].config(text=f"{shift['total_sales']:.2f} ₽")
        self.detail_labels['transactions_count'].config(text=str(shift['transactions_count']))
        
        # Продажи по типам оплаты
        sales_by_payment = self.db.fetch_all('''
            SELECT payment_method, SUM(final_amount) as total
            FROM sales 
            WHERE shift_id = ?
            GROUP BY payment_method
        ''', (shift['id'],))
        
        cash_sales = 0
        card_sales = 0
        
        for sale in sales_by_payment:
            if sale['payment_method'] == 'Наличные':
                cash_sales = sale['total']
            elif sale['payment_method'] == 'Банковская карта':
                card_sales = sale['total']
                
        self.detail_labels['cash_sales'].config(text=f"{cash_sales:.2f} ₽")
        self.detail_labels['card_sales'].config(text=f"{card_sales:.2f} ₽")
        
    def clear_shift_details(self):
        """Очистка деталей смены"""
        for label in self.detail_labels.values():
            label.config(text="-")
            
    def print_z_report(self):
        """Печать Z-отчёта"""
        messagebox.showinfo("Печать", "Печать Z-отчёта в разработке")
        
    def detailed_report(self):
        """Детальный отчёт по смене"""
        messagebox.showinfo("Отчёт", "Детальный отчёт в разработке")
        
    def show_shift_sales(self):
        """Показать продажи смены"""
        selection = self.shifts_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите смену")
            return
            
        messagebox.showinfo("Продажи", "Просмотр продаж смены в разработке")
        
    def print_report(self, content):
        """Печать отчёта"""
        print("=== ПЕЧАТЬ ОТЧЁТА ===")
        print(content)
        print("=== КОНЕЦ ОТЧЁТА ===")


class ShiftOpenDialog:
    def __init__(self, parent, db, main_app):
        self.db = db
        self.main_app = main_app
        self.result = False
        
        # Создание окна
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("Открытие смены")
        self.dialog.geometry("350x200")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        self.create_form()
        self.dialog.wait_window()
        
    def create_form(self):
        """Создание формы открытия смены"""
        main_frame = ttk.Frame(self.dialog)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Заголовок
        ttk.Label(main_frame, text="Открытие новой смены", 
                 font=('Segoe UI', 12, 'bold')).pack(pady=10)
        
        # Информация о кассире
        ttk.Label(main_frame, text=f"Кассир: {self.main_app.current_user['name']}").pack(pady=5)
        
        # Сумма в кассе
        amount_frame = ttk.Frame(main_frame)
        amount_frame.pack(pady=10)
        
        ttk.Label(amount_frame, text="Сумма в кассе на начало смены:").pack()
        self.amount_var = tk.StringVar(value="0.00")
        amount_entry = ttk.Entry(amount_frame, textvariable=self.amount_var, 
                               width=15, font=('Segoe UI', 12))
        amount_entry.pack(pady=5)
        amount_entry.focus()
        amount_entry.select_range(0, tk.END)
        
        # Кнопки
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(pady=20)
        
        ttk.Button(btn_frame, text="Открыть смену", 
                  command=self.open_shift).pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_frame, text="Отмена", 
                  command=self.dialog.destroy).pack(side=tk.LEFT, padx=10)
        
        # Enter для открытия смены
        self.dialog.bind('<Return>', lambda e: self.open_shift())
        
    def open_shift(self):
        """Открытие смены"""
        try:
            amount = float(self.amount_var.get())
            if amount < 0:
                raise ValueError()
        except ValueError:
            messagebox.showerror("Ошибка", "Введите корректную сумму")
            return
            
        try:
            # Создание смены в БД
            shift_id = self.db.open_shift(self.main_app.current_user['username'], amount)
            
            # Обновление текущей смены в приложении
            self.main_app.current_shift = {
                'id': shift_id,
                'start_time': datetime.now(),
                'start_amount': amount,
                'current_amount': amount
            }
            
            self.main_app.update_user_info()
            self.main_app.cash_amount_label.config(text=f"{amount:.2f} ₽")
            
            self.result = True
            self.dialog.destroy()
            
            messagebox.showinfo("Успех", f"Смена #{shift_id} открыта")
            
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка открытия смены: {str(e)}")


class ShiftCloseDialog:
    def __init__(self, parent, db, main_app):
        self.db = db
        self.main_app = main_app
        self.result = False
        
        # Создание окна
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("Закрытие смены")
        self.dialog.geometry("400x300")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        self.create_form()
        self.dialog.wait_window()
        
    def create_form(self):
        """Создание формы закрытия смены"""
        main_frame = ttk.Frame(self.dialog)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Заголовок
        ttk.Label(main_frame, text="Закрытие смены", 
                 font=('Segoe UI', 12, 'bold')).pack(pady=10)
        
        # Информация о смене
        shift = self.main_app.current_shift
        info_text = f"""
Смена: {shift['id']}
Кассир: {self.main_app.current_user['name']}
Время открытия: {shift['start_time'].strftime('%d.%m.%Y %H:%M')}
Начальная сумма: {shift['start_amount']:.2f} ₽
        """
        
        ttk.Label(main_frame, text=info_text, justify=tk.LEFT).pack(pady=10)
        
        # Фактическая сумма в кассе
        amount_frame = ttk.Frame(main_frame)
        amount_frame.pack(pady=10)
        
        ttk.Label(amount_frame, text="Фактическая сумма в кассе:").pack()
        self.amount_var = tk.StringVar(value=str(shift.get('current_amount', shift['start_amount'])))
        amount_entry = ttk.Entry(amount_frame, textvariable=self.amount_var, 
                               width=15, font=('Segoe UI', 12))
        amount_entry.pack(pady=5)
        amount_entry.focus()
        amount_entry.select_range(0, tk.END)
        
        # Кнопки
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(pady=20)
        
        ttk.Button(btn_frame, text="Закрыть смену", 
                  command=self.close_shift).pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_frame, text="Отмена", 
                  command=self.dialog.destroy).pack(side=tk.LEFT, padx=10)
        
    def close_shift(self):
        """Закрытие смены"""
        try:
            end_amount = float(self.amount_var.get())
            if end_amount < 0:
                raise ValueError()
        except ValueError:
            messagebox.showerror("Ошибка", "Введите корректную сумму")
            return
            
        try:
            shift = self.main_app.current_shift
            
            # Получение статистики смены
            sales_stats = self.db.fetch_one('''
                SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as total
                FROM sales 
                WHERE shift_id = ?
            ''', (shift['id'],))
            
            # Закрытие смены в БД
            self.db.execute_query('''
                UPDATE shifts 
                SET end_time = CURRENT_TIMESTAMP, 
                    end_amount = ?, 
                    total_sales = ?, 
                    transactions_count = ?,
                    status = 'closed'
                WHERE id = ?
            ''', (end_amount, sales_stats['total'], sales_stats['count'], shift['id']))
            
            self.db.commit()
            
            # Формирование Z-отчёта
            self.generate_z_report(shift, end_amount, sales_stats)
            
            self.result = True
            self.dialog.destroy()
            
            messagebox.showinfo("Успех", f"Смена #{shift['id']} закрыта")
            
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка закрытия смены: {str(e)}")
            
    def generate_z_report(self, shift, end_amount, sales_stats):
        """Формирование Z-отчёта"""
        # Здесь будет код формирования и печати Z-отчёта
        print(f"=== Z-ОТЧЁТ СМЕНЫ {shift['id']} ===")
        print(f"Дата закрытия: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}")
        print(f"Кассир: {self.main_app.current_user['name']}")
        print(f"Начальная сумма: {shift['start_amount']:.2f} ₽")
        print(f"Конечная сумма: {end_amount:.2f} ₽")
        print(f"Продано на сумму: {sales_stats['total']:.2f} ₽")
        print(f"Количество операций: {sales_stats['count']}")
        print("=== КОНЕЦ Z-ОТЧЁТА ===")