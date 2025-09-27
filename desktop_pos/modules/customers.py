"""
Модуль управления клиентами
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime


class CustomersModule:
    def __init__(self, parent, db, main_app):
        self.parent = parent
        self.db = db
        self.main_app = main_app
        
        self.frame = ttk.Frame(parent)
        self.create_interface()
        self.load_customers()
        
    def create_interface(self):
        """Создание интерфейса модуля клиентов"""
        # Панель управления
        control_frame = ttk.Frame(self.frame)
        control_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Поиск
        ttk.Label(control_frame, text="Поиск клиента:").pack(side=tk.LEFT, padx=5)
        self.search_var = tk.StringVar()
        self.search_var.trace('w', self.on_search_change)
        search_entry = ttk.Entry(control_frame, textvariable=self.search_var, width=30)
        search_entry.pack(side=tk.LEFT, padx=5)
        
        # Кнопки
        btn_frame = ttk.Frame(control_frame)
        btn_frame.pack(side=tk.RIGHT, padx=5)
        
        ttk.Button(btn_frame, text="Добавить клиента", 
                  command=self.add_customer).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="Редактировать", 
                  command=self.edit_customer).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="Удалить", 
                  command=self.delete_customer).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="История покупок", 
                  command=self.show_purchase_history).pack(side=tk.LEFT, padx=2)
        
        # Основной контейнер
        main_paned = ttk.PanedWindow(self.frame, orient=tk.HORIZONTAL)
        main_paned.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Таблица клиентов
        self.create_customers_table(main_paned)
        
        # Панель информации о клиенте
        self.create_customer_info_panel(main_paned)
        
    def create_customers_table(self, parent):
        """Создание таблицы клиентов"""
        table_frame = ttk.LabelFrame(parent, text="Список клиентов")
        parent.add(table_frame, weight=2)
        
        # Создание Treeview
        columns = ('ID', 'Имя', 'Телефон', 'Email', 'Скидка %', 'Бонусы', 'Всего покупок')
        
        self.customers_tree = ttk.Treeview(table_frame, columns=columns, show='headings', height=15)
        
        # Настройка колонок
        column_widths = [50, 200, 120, 180, 80, 80, 120]
        for i, (col, width) in enumerate(zip(columns, column_widths)):
            self.customers_tree.heading(col, text=col)
            self.customers_tree.column(col, width=width, minwidth=width//2)
        
        # Прокрутка
        scrollbar_v = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.customers_tree.yview)
        scrollbar_h = ttk.Scrollbar(table_frame, orient=tk.HORIZONTAL, command=self.customers_tree.xview)
        self.customers_tree.configure(yscrollcommand=scrollbar_v.set, xscrollcommand=scrollbar_h.set)
        
        # Размещение
        self.customers_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar_v.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Обработчики
        self.customers_tree.bind('<<TreeviewSelect>>', self.on_customer_select)
        self.customers_tree.bind('<Double-1>', lambda e: self.edit_customer())
        
    def create_customer_info_panel(self, parent):
        """Панель информации о выбранном клиенте"""
        info_frame = ttk.LabelFrame(parent, text="Информация о клиенте")
        parent.add(info_frame, weight=1)
        
        # Детали клиента
        details_frame = ttk.Frame(info_frame)
        details_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Поля информации
        self.info_labels = {}
        fields = [
            ('name', 'Имя:'),
            ('phone', 'Телефон:'),
            ('email', 'Email:'),
            ('address', 'Адрес:'),
            ('discount_percent', 'Скидка:'),
            ('bonus_points', 'Бонусы:'),
            ('total_purchases', 'Всего покупок:'),
            ('created_at', 'Дата регистрации:')
        ]
        
        for i, (field, label) in enumerate(fields):
            ttk.Label(details_frame, text=label).grid(row=i, column=0, sticky=tk.W, pady=2)
            value_label = ttk.Label(details_frame, text="-", foreground='blue')
            value_label.grid(row=i, column=1, sticky=tk.W, padx=10, pady=2)
            self.info_labels[field] = value_label
            
        # Кнопки быстрых действий
        actions_frame = ttk.LabelFrame(info_frame, text="Действия")
        actions_frame.pack(fill=tk.X, padx=10, pady=10)
        
        ttk.Button(actions_frame, text="📞 Позвонить", 
                  command=self.call_customer).pack(fill=tk.X, pady=2)
        ttk.Button(actions_frame, text="📧 Написать email", 
                  command=self.email_customer).pack(fill=tk.X, pady=2)
        ttk.Button(actions_frame, text="🎁 Начислить бонусы", 
                  command=self.add_bonus_points).pack(fill=tk.X, pady=2)
        ttk.Button(actions_frame, text="💳 Изменить скидку", 
                  command=self.change_discount).pack(fill=tk.X, pady=2)
        
        # Последние покупки
        purchases_frame = ttk.LabelFrame(info_frame, text="Последние покупки")
        purchases_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        columns = ('Дата', 'Сумма', 'Способ оплаты')
        self.purchases_tree = ttk.Treeview(purchases_frame, columns=columns, show='headings', height=6)
        
        for col in columns:
            self.purchases_tree.heading(col, text=col)
            self.purchases_tree.column(col, width=100)
            
        purchases_scrollbar = ttk.Scrollbar(purchases_frame, orient=tk.VERTICAL, command=self.purchases_tree.yview)
        self.purchases_tree.configure(yscrollcommand=purchases_scrollbar.set)
        
        self.purchases_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        purchases_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
    def load_customers(self):
        """Загрузка клиентов в таблицу"""
        # Очистка таблицы
        for item in self.customers_tree.get_children():
            self.customers_tree.delete(item)
            
        # Загрузка данных
        customers = self.db.get_all_customers()
        
        for customer in customers:
            self.customers_tree.insert('', 'end', values=(
                customer['id'],
                customer['name'],
                customer['phone'] or '',
                customer['email'] or '',
                f"{customer['discount_percent']:.0f}%",
                customer['bonus_points'],
                f"{customer['total_purchases']:.2f} ₽"
            ))
            
        self.main_app.status_label.config(text=f"Загружено клиентов: {len(customers)}")
        
    def on_search_change(self, *args):
        """Обработчик изменения поиска"""
        search_term = self.search_var.get()
        
        if len(search_term) >= 2:
            self.search_customers(search_term)
        elif len(search_term) == 0:
            self.load_customers()
            
    def search_customers(self, search_term):
        """Поиск клиентов"""
        # Очистка таблицы
        for item in self.customers_tree.get_children():
            self.customers_tree.delete(item)
            
        # Поиск и загрузка
        customers = self.db.search_customers(search_term)
        
        for customer in customers:
            self.customers_tree.insert('', 'end', values=(
                customer['id'],
                customer['name'],
                customer['phone'] or '',
                customer['email'] or '',
                f"{customer['discount_percent']:.0f}%",
                customer['bonus_points'],
                f"{customer['total_purchases']:.2f} ₽"
            ))
            
    def on_customer_select(self, event):
        """Обработчик выбора клиента"""
        selection = self.customers_tree.selection()
        if not selection:
            self.clear_customer_info()
            return
            
        item = self.customers_tree.item(selection[0])
        customer_id = item['values'][0]
        
        # Получение полной информации о клиенте
        customer = self.db.fetch_one('SELECT * FROM customers WHERE id = ?', (customer_id,))
        
        if customer:
            self.show_customer_info(customer)
            self.load_customer_purchases(customer_id)
            
    def show_customer_info(self, customer):
        """Отображение информации о клиенте"""
        self.info_labels['name'].config(text=customer['name'])
        self.info_labels['phone'].config(text=customer['phone'] or 'Не указан')
        self.info_labels['email'].config(text=customer['email'] or 'Не указан')
        self.info_labels['address'].config(text=customer['address'] or 'Не указан')
        self.info_labels['discount_percent'].config(text=f"{customer['discount_percent']:.0f}%")
        self.info_labels['bonus_points'].config(text=str(customer['bonus_points']))
        self.info_labels['total_purchases'].config(text=f"{customer['total_purchases']:.2f} ₽")
        
        # Форматирование даты
        if customer['created_at']:
            try:
                date_obj = datetime.strptime(customer['created_at'], '%Y-%m-%d %H:%M:%S')
                formatted_date = date_obj.strftime('%d.%m.%Y')
            except:
                formatted_date = customer['created_at']
            self.info_labels['created_at'].config(text=formatted_date)
        else:
            self.info_labels['created_at'].config(text='Не указана')
            
    def clear_customer_info(self):
        """Очистка информации о клиенте"""
        for label in self.info_labels.values():
            label.config(text='-')
            
        # Очистка покупок
        for item in self.purchases_tree.get_children():
            self.purchases_tree.delete(item)
            
    def load_customer_purchases(self, customer_id):
        """Загрузка покупок клиента"""
        # Очистка таблицы покупок
        for item in self.purchases_tree.get_children():
            self.purchases_tree.delete(item)
            
        # Загрузка последних покупок
        purchases = self.db.fetch_all('''
            SELECT created_at, final_amount, payment_method 
            FROM sales 
            WHERE customer_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        ''', (customer_id,))
        
        for purchase in purchases:
            # Форматирование даты
            try:
                date_obj = datetime.strptime(purchase['created_at'], '%Y-%m-%d %H:%M:%S')
                formatted_date = date_obj.strftime('%d.%m.%Y')
            except:
                formatted_date = purchase['created_at']
                
            self.purchases_tree.insert('', 'end', values=(
                formatted_date,
                f"{purchase['final_amount']:.2f} ₽",
                purchase['payment_method']
            ))
            
    def add_customer(self):
        """Добавление нового клиента"""
        dialog = CustomerDialog(self.frame, self.db, "Добавление клиента")
        if dialog.result:
            self.load_customers()
            
    def edit_customer(self):
        """Редактирование клиента"""
        selection = self.customers_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите клиента для редактирования")
            return
            
        item = self.customers_tree.item(selection[0])
        customer_id = item['values'][0]
        
        # Получение полных данных клиента
        customer = self.db.fetch_one('SELECT * FROM customers WHERE id = ?', (customer_id,))
        
        dialog = CustomerDialog(self.frame, self.db, "Редактирование клиента", customer)
        if dialog.result:
            self.load_customers()
            # Обновление информации, если тот же клиент выбран
            self.on_customer_select(None)
            
    def delete_customer(self):
        """Удаление клиента"""
        selection = self.customers_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите клиента для удаления")
            return
            
        item = self.customers_tree.item(selection[0])
        customer_name = item['values'][1]
        
        if messagebox.askyesno("Подтверждение", f"Удалить клиента '{customer_name}'?"):
            customer_id = item['values'][0]
            self.db.execute_query('UPDATE customers SET is_active = 0 WHERE id = ?', (customer_id,))
            self.db.commit()
            self.load_customers()
            self.clear_customer_info()
            
    def show_purchase_history(self):
        """Показать полную историю покупок"""
        selection = self.customers_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите клиента")
            return
            
        item = self.customers_tree.item(selection[0])
        customer_id = item['values'][0]
        customer_name = item['values'][1]
        
        # Создание окна истории
        history_window = tk.Toplevel(self.frame)
        history_window.title(f"История покупок - {customer_name}")
        history_window.geometry("800x600")
        history_window.transient(self.frame)
        
        # Таблица истории
        columns = ('Дата', 'Чек №', 'Сумма', 'Скидка', 'Способ оплаты', 'Кассир')
        history_tree = ttk.Treeview(history_window, columns=columns, show='headings')
        
        for col in columns:
            history_tree.heading(col, text=col)
            
        # Загрузка истории
        history = self.db.fetch_all('''
            SELECT s.created_at, s.id, s.final_amount, s.discount_amount, 
                   s.payment_method, u.name as cashier_name
            FROM sales s
            JOIN shifts sh ON s.shift_id = sh.id
            JOIN users u ON sh.cashier_id = u.id
            WHERE s.customer_id = ?
            ORDER BY s.created_at DESC
        ''', (customer_id,))
        
        for record in history:
            try:
                date_obj = datetime.strptime(record['created_at'], '%Y-%m-%d %H:%M:%S')
                formatted_date = date_obj.strftime('%d.%m.%Y %H:%M')
            except:
                formatted_date = record['created_at']
                
            history_tree.insert('', 'end', values=(
                formatted_date,
                record['id'],
                f"{record['final_amount']:.2f} ₽",
                f"{record['discount_amount']:.2f} ₽",
                record['payment_method'],
                record['cashier_name']
            ))
            
        history_tree.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        ttk.Button(history_window, text="Закрыть", 
                  command=history_window.destroy).pack(pady=10)
        
    def call_customer(self):
        """Позвонить клиенту"""
        selection = self.customers_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите клиента")
            return
            
        item = self.customers_tree.item(selection[0])
        phone = item['values'][2]
        
        if phone:
            messagebox.showinfo("Звонок", f"Звоним на номер: {phone}")
        else:
            messagebox.showwarning("Внимание", "У клиента не указан телефон")
            
    def email_customer(self):
        """Написать email клиенту"""
        messagebox.showinfo("Email", "Функция отправки email в разработке")
        
    def add_bonus_points(self):
        """Начислить бонусные баллы"""
        selection = self.customers_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите клиента")
            return
            
        points = tk.simpledialog.askinteger("Бонусы", "Количество баллов для начисления:", 
                                           minvalue=1, maxvalue=10000)
        if points:
            item = self.customers_tree.item(selection[0])
            customer_id = item['values'][0]
            
            self.db.execute_query('''
                UPDATE customers 
                SET bonus_points = bonus_points + ? 
                WHERE id = ?
            ''', (points, customer_id))
            self.db.commit()
            
            self.load_customers()
            self.on_customer_select(None)
            messagebox.showinfo("Успех", f"Начислено {points} бонусных баллов")
            
    def change_discount(self):
        """Изменить процент скидки"""
        selection = self.customers_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите клиента")
            return
            
        current_discount = float(item['values'][4].replace('%', ''))
        new_discount = tk.simpledialog.askfloat("Скидка", "Новый процент скидки:", 
                                               initialvalue=current_discount,
                                               minvalue=0, maxvalue=50)
        if new_discount is not None:
            item = self.customers_tree.item(selection[0])
            customer_id = item['values'][0]
            
            self.db.execute_query('''
                UPDATE customers 
                SET discount_percent = ? 
                WHERE id = ?
            ''', (new_discount, customer_id))
            self.db.commit()
            
            self.load_customers()
            self.on_customer_select(None)
            messagebox.showinfo("Успех", f"Скидка изменена на {new_discount}%")


class CustomerDialog:
    def __init__(self, parent, db, title, customer=None):
        self.db = db
        self.result = False
        self.customer = customer
        
        # Создание окна
        self.dialog = tk.Toplevel(parent)
        self.dialog.title(title)
        self.dialog.geometry("450x400")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        self.create_form()
        
        # Если редактирование - заполняем поля
        if customer:
            self.fill_form()
            
        self.dialog.wait_window()
        
    def create_form(self):
        """Создание формы клиента"""
        # Основная рамка
        main_frame = ttk.Frame(self.dialog)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=15)
        
        # Поля формы
        row = 0
        
        # Имя
        ttk.Label(main_frame, text="* Имя:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.name_var = tk.StringVar()
        ttk.Entry(main_frame, textvariable=self.name_var, width=40).grid(row=row, column=1, pady=5, sticky=tk.W+tk.E)
        row += 1
        
        # Телефон
        ttk.Label(main_frame, text="Телефон:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.phone_var = tk.StringVar()
        ttk.Entry(main_frame, textvariable=self.phone_var, width=40).grid(row=row, column=1, pady=5, sticky=tk.W+tk.E)
        row += 1
        
        # Email
        ttk.Label(main_frame, text="Email:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.email_var = tk.StringVar()
        ttk.Entry(main_frame, textvariable=self.email_var, width=40).grid(row=row, column=1, pady=5, sticky=tk.W+tk.E)
        row += 1
        
        # Адрес
        ttk.Label(main_frame, text="Адрес:").grid(row=row, column=0, sticky=tk.W+tk.N, pady=5)
        self.address_text = tk.Text(main_frame, width=40, height=3)
        self.address_text.grid(row=row, column=1, pady=5, sticky=tk.W+tk.E)
        row += 1
        
        # Скидка
        ttk.Label(main_frame, text="Скидка (%):").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.discount_var = tk.StringVar(value="0")
        discount_spinbox = tk.Spinbox(main_frame, textvariable=self.discount_var, 
                                     from_=0, to=50, width=10)
        discount_spinbox.grid(row=row, column=1, pady=5, sticky=tk.W)
        row += 1
        
        # Бонусные баллы
        ttk.Label(main_frame, text="Бонусные баллы:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.bonus_var = tk.StringVar(value="0")
        ttk.Entry(main_frame, textvariable=self.bonus_var, width=15).grid(row=row, column=1, pady=5, sticky=tk.W)
        row += 1
        
        # Настройка растяжения колонки
        main_frame.grid_columnconfigure(1, weight=1)
        
        # Кнопки
        btn_frame = ttk.Frame(self.dialog)
        btn_frame.pack(fill=tk.X, padx=15, pady=15)
        
        ttk.Button(btn_frame, text="Сохранить", command=self.save_customer).pack(side=tk.RIGHT, padx=5)
        ttk.Button(btn_frame, text="Отмена", command=self.dialog.destroy).pack(side=tk.RIGHT, padx=5)
        
    def fill_form(self):
        """Заполнение формы данными клиента"""
        if self.customer:
            self.name_var.set(self.customer['name'])
            self.phone_var.set(self.customer['phone'] or '')
            self.email_var.set(self.customer['email'] or '')
            self.address_text.insert(1.0, self.customer['address'] or '')
            self.discount_var.set(str(int(self.customer['discount_percent'])))
            self.bonus_var.set(str(self.customer['bonus_points']))
            
    def save_customer(self):
        """Сохранение клиента"""
        # Валидация
        if not self.name_var.get().strip():
            messagebox.showerror("Ошибка", "Введите имя клиента")
            return
            
        try:
            discount = float(self.discount_var.get())
            if discount < 0 or discount > 50:
                raise ValueError()
        except ValueError:
            messagebox.showerror("Ошибка", "Введите корректный процент скидки (0-50)")
            return
            
        try:
            bonus_points = int(self.bonus_var.get())
            if bonus_points < 0:
                raise ValueError()
        except ValueError:
            messagebox.showerror("Ошибка", "Введите корректное количество бонусов")
            return
            
        # Подготовка данных
        name = self.name_var.get().strip()
        phone = self.phone_var.get().strip() or None
        email = self.email_var.get().strip() or None
        address = self.address_text.get(1.0, tk.END).strip() or None
        
        try:
            if self.customer:
                # Обновление
                self.db.execute_query('''
                    UPDATE customers 
                    SET name=?, phone=?, email=?, address=?, discount_percent=?, bonus_points=?
                    WHERE id=?
                ''', (name, phone, email, address, discount, bonus_points, self.customer['id']))
                messagebox.showinfo("Успех", "Клиент обновлён")
            else:
                # Добавление
                self.db.add_customer((name, phone, email, address, discount))
                # Обновление бонусов если нужно
                if bonus_points > 0:
                    customer_id = self.db.connection.lastrowid
                    self.db.execute_query('''
                        UPDATE customers SET bonus_points = ? WHERE id = ?
                    ''', (bonus_points, customer_id))
                messagebox.showinfo("Успех", "Клиент добавлен")
                
            self.db.commit()
            self.result = True
            self.dialog.destroy()
            
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка сохранения: {str(e)}")