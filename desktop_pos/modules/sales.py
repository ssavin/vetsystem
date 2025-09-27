"""
Модуль продаж (касса)
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
import json
from .integrations import FiscalPrinter, YooKassaPayments
from .return_dialog import ReturnDialog


class SalesModule:
    def __init__(self, parent, db, main_app):
        self.parent = parent
        self.db = db
        self.main_app = main_app
        
        self.frame = ttk.Frame(parent)
        self.current_sale_items = []
        self.current_customer = None
        self.manual_discount_percent = 0.0
        
        self.create_interface()
        
    def create_interface(self):
        """Создание интерфейса кассы"""
        # Главный контейнер с разделением на 2 части
        main_paned = ttk.PanedWindow(self.frame, orient=tk.HORIZONTAL)
        main_paned.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Левая панель - поиск и добавление товаров
        self.create_product_panel(main_paned)
        
        # Правая панель - чек и оплата
        self.create_receipt_panel(main_paned)
        
    def create_product_panel(self, parent):
        """Панель поиска и выбора товаров"""
        left_frame = ttk.LabelFrame(parent, text="Поиск товаров")
        parent.add(left_frame, weight=1)
        
        # Поиск по штрихкоду/названию
        search_frame = ttk.Frame(left_frame)
        search_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(search_frame, text="Штрихкод/Название:").pack(anchor=tk.W)
        
        self.product_search_var = tk.StringVar()
        search_entry = ttk.Entry(search_frame, textvariable=self.product_search_var, font=('Segoe UI', 12))
        search_entry.pack(fill=tk.X, pady=(2, 10))
        search_entry.bind('<Return>', self.on_barcode_enter)
        search_entry.bind('<KeyRelease>', self.on_search_change)
        search_entry.focus()
        
        # Кнопки быстрых действий
        quick_frame = ttk.Frame(left_frame)
        quick_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(quick_frame, text="📱 Сканировать", 
                  command=self.scan_barcode).pack(side=tk.LEFT, padx=2)
        ttk.Button(quick_frame, text="🔍 Поиск товара", 
                  command=self.search_products).pack(side=tk.LEFT, padx=2)
        ttk.Button(quick_frame, text="➕ Добавить вручную", 
                  command=self.add_manual_item).pack(side=tk.LEFT, padx=2)
        
        # Результаты поиска
        self.create_search_results(left_frame)
        
    def create_search_results(self, parent):
        """Таблица результатов поиска товаров"""
        results_frame = ttk.LabelFrame(parent, text="Результаты поиска")
        results_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Таблица
        columns = ('ID', 'Название', 'Цена', 'Остаток')
        self.search_tree = ttk.Treeview(results_frame, columns=columns, show='headings', height=10)
        
        # Настройка колонок
        self.search_tree.heading('ID', text='ID')
        self.search_tree.heading('Название', text='Название')
        self.search_tree.heading('Цена', text='Цена')
        self.search_tree.heading('Остаток', text='Остаток')
        
        self.search_tree.column('ID', width=50, minwidth=50)
        self.search_tree.column('Название', width=250, minwidth=200)
        self.search_tree.column('Цена', width=80, minwidth=80)
        self.search_tree.column('Остаток', width=80, minwidth=80)
        
        # Прокрутка
        search_scrollbar = ttk.Scrollbar(results_frame, orient=tk.VERTICAL, command=self.search_tree.yview)
        self.search_tree.configure(yscrollcommand=search_scrollbar.set)
        
        self.search_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        search_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Обработчики
        self.search_tree.bind('<Double-1>', self.add_selected_product)
        self.search_tree.bind('<Return>', self.add_selected_product)
        
    def create_receipt_panel(self, parent):
        """Панель чека и оплаты"""
        right_frame = ttk.LabelFrame(parent, text="Чек")
        parent.add(right_frame, weight=1)
        
        # Информация о клиенте
        customer_frame = ttk.Frame(right_frame)
        customer_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(customer_frame, text="Клиент:").pack(side=tk.LEFT)
        self.customer_label = ttk.Label(customer_frame, text="Не выбран", 
                                       foreground='gray')
        self.customer_label.pack(side=tk.LEFT, padx=10)
        
        ttk.Button(customer_frame, text="Выбрать клиента", 
                  command=self.select_customer).pack(side=tk.RIGHT)
        
        # Таблица позиций чека
        self.create_receipt_table(right_frame)
        
        # Итоги и оплата
        self.create_totals_panel(right_frame)
        
    def create_receipt_table(self, parent):
        """Таблица позиций чека"""
        table_frame = ttk.Frame(parent)
        table_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Таблица
        columns = ('Название', 'Кол-во', 'Цена', 'Сумма')
        self.receipt_tree = ttk.Treeview(table_frame, columns=columns, show='headings', height=8)
        
        # Настройка колонок
        self.receipt_tree.heading('Название', text='Название')
        self.receipt_tree.heading('Кол-во', text='Кол-во')
        self.receipt_tree.heading('Цена', text='Цена')
        self.receipt_tree.heading('Сумма', text='Сумма')
        
        self.receipt_tree.column('Название', width=200, minwidth=150)
        self.receipt_tree.column('Кол-во', width=80, minwidth=60)
        self.receipt_tree.column('Цена', width=80, minwidth=60)
        self.receipt_tree.column('Сумма', width=100, minwidth=80)
        
        # Прокрутка
        receipt_scrollbar = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.receipt_tree.yview)
        self.receipt_tree.configure(yscrollcommand=receipt_scrollbar.set)
        
        self.receipt_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        receipt_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Кнопки управления позициями
        btn_frame = ttk.Frame(parent)
        btn_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(btn_frame, text="Удалить позицию", 
                  command=self.remove_item).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="Изменить количество", 
                  command=self.change_quantity).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="Очистить чек", 
                  command=self.clear_receipt).pack(side=tk.LEFT, padx=2)
        
    def create_totals_panel(self, parent):
        """Панель итогов и оплаты"""
        totals_frame = ttk.LabelFrame(parent, text="Итоги")
        totals_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Суммы
        self.subtotal_var = tk.StringVar(value="0.00 ₽")
        self.discount_var = tk.StringVar(value="0.00 ₽")
        self.total_var = tk.StringVar(value="0.00 ₽")
        
        ttk.Label(totals_frame, text="Подытог:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=2)
        ttk.Label(totals_frame, textvariable=self.subtotal_var, 
                 font=('Segoe UI', 10, 'bold')).grid(row=0, column=1, sticky=tk.E, padx=5, pady=2)
        
        ttk.Label(totals_frame, text="Скидка:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=2)
        ttk.Label(totals_frame, textvariable=self.discount_var, 
                 foreground='red').grid(row=1, column=1, sticky=tk.E, padx=5, pady=2)
        
        ttk.Label(totals_frame, text="ИТОГО:").grid(row=2, column=0, sticky=tk.W, padx=5, pady=2)
        ttk.Label(totals_frame, textvariable=self.total_var, 
                 font=('Segoe UI', 14, 'bold'), foreground='green').grid(row=2, column=1, sticky=tk.E, padx=5, pady=2)
        
        totals_frame.grid_columnconfigure(1, weight=1)
        
        # Способ оплаты
        payment_frame = ttk.Frame(totals_frame)
        payment_frame.grid(row=3, column=0, columnspan=2, sticky=tk.W+tk.E, padx=5, pady=10)
        
        ttk.Label(payment_frame, text="Способ оплаты:").pack(side=tk.LEFT)
        
        self.payment_method_var = tk.StringVar(value="Наличные")
        payment_combo = ttk.Combobox(payment_frame, textvariable=self.payment_method_var, 
                                   values=["Наличные", "Банковская карта", "Безналичный расчёт"], 
                                   state="readonly", width=20)
        payment_combo.pack(side=tk.LEFT, padx=10)
        
        # Ручные скидки
        discount_frame = ttk.Frame(totals_frame)
        discount_frame.grid(row=3, column=0, columnspan=2, sticky=tk.W+tk.E, padx=5, pady=5)
        
        ttk.Label(discount_frame, text="Ручная скидка (%):").pack(side=tk.LEFT)
        self.manual_discount_var = tk.DoubleVar(value=0.0)
        discount_entry = ttk.Entry(discount_frame, textvariable=self.manual_discount_var, width=10)
        discount_entry.pack(side=tk.LEFT, padx=5)
        ttk.Button(discount_frame, text="Применить", 
                  command=self.apply_manual_discount).pack(side=tk.LEFT, padx=5)
        
        # Кнопки оплаты
        pay_frame = ttk.Frame(totals_frame)
        pay_frame.grid(row=5, column=0, columnspan=2, sticky=tk.W+tk.E, padx=5, pady=5)
        
        ttk.Button(pay_frame, text="💰 ОПЛАТА", command=self.process_payment,
                  style='Action.TButton').pack(fill=tk.X, pady=2)
        ttk.Button(pay_frame, text="🔄 ВОЗВРАТ", command=self.process_return,
                  style='Action.TButton').pack(fill=tk.X, pady=2)
        ttk.Button(pay_frame, text="📋 Отложить чек", command=self.hold_receipt).pack(fill=tk.X, pady=2)
        
    def on_search_change(self, event=None):
        """Обработчик изменения поиска"""
        search_term = self.product_search_var.get()
        
        if len(search_term) >= 2:
            self.search_products_live(search_term)
        elif len(search_term) == 0:
            self.clear_search_results()
            
    def on_barcode_enter(self, event=None):
        """Обработчик ввода штрихкода"""
        barcode = self.product_search_var.get().strip()
        
        if barcode:
            # Поиск товара по штрихкоду
            product = self.db.get_product_by_barcode(barcode)
            
            if product:
                self.add_product_to_receipt(product)
                self.product_search_var.set("")  # Очистка поля
            else:
                messagebox.showwarning("Товар не найден", f"Товар со штрихкодом '{barcode}' не найден")
                
    def search_products_live(self, search_term):
        """Живой поиск товаров"""
        # Очистка результатов
        for item in self.search_tree.get_children():
            self.search_tree.delete(item)
            
        # Поиск и вывод результатов
        products = self.db.search_products(search_term)
        
        for product in products[:10]:  # Ограничиваем 10 результатами
            self.search_tree.insert('', 'end', values=(
                product['id'],
                product['name'],
                f"{product['price']:.2f} ₽",
                f"{product['quantity']:.1f} {product['unit']}"
            ), tags=(product['id'],))
            
    def clear_search_results(self):
        """Очистка результатов поиска"""
        for item in self.search_tree.get_children():
            self.search_tree.delete(item)
            
    def add_selected_product(self, event=None):
        """Добавление выбранного товара в чек"""
        selection = self.search_tree.selection()
        if not selection:
            return
            
        item = self.search_tree.item(selection[0])
        product_id = item['values'][0]
        
        # Получение полных данных товара
        product = self.db.fetch_one('SELECT * FROM products WHERE id = ?', (product_id,))
        
        if product:
            self.add_product_to_receipt(product)
            
    def add_product_to_receipt(self, product, quantity=1):
        """Добавление товара в чек"""
        # Проверка остатков
        if product['quantity'] < quantity:
            messagebox.showwarning("Недостаточно товара", 
                                 f"На складе только {product['quantity']} {product['unit']}")
            return
            
        # Проверка, есть ли уже такой товар в чеке
        for i, item in enumerate(self.current_sale_items):
            if item['product_id'] == product['id']:
                # Увеличиваем количество
                new_quantity = item['quantity'] + quantity
                if product['quantity'] >= new_quantity:
                    self.current_sale_items[i]['quantity'] = new_quantity
                    self.current_sale_items[i]['total'] = new_quantity * item['price']
                else:
                    messagebox.showwarning("Недостаточно товара", 
                                         f"На складе только {product['quantity']} {product['unit']}")
                    return
                break
        else:
            # Добавляем новую позицию
            sale_item = {
                'product_id': product['id'],
                'name': product['name'],
                'price': float(product['price']),
                'quantity': quantity,
                'total': float(product['price']) * quantity,
                'unit': product['unit']
            }
            self.current_sale_items.append(sale_item)
            
        self.update_receipt_display()
        
    def update_receipt_display(self):
        """Обновление отображения чека"""
        # Очистка таблицы
        for item in self.receipt_tree.get_children():
            self.receipt_tree.delete(item)
            
        # Заполнение позициями
        subtotal = 0
        for i, item in enumerate(self.current_sale_items):
            self.receipt_tree.insert('', 'end', values=(
                item['name'],
                f"{item['quantity']:.1f} {item['unit']}",
                f"{item['price']:.2f} ₽",
                f"{item['total']:.2f} ₽"
            ), tags=(i,))
            subtotal += item['total']
            
        # Обновление итогов
        discount = 0
        # Скидка клиента
        if self.current_customer and self.current_customer.get('discount_percent', 0) > 0:
            discount += subtotal * self.current_customer['discount_percent'] / 100
        # Ручная скидка
        if self.manual_discount_percent > 0:
            discount += subtotal * self.manual_discount_percent / 100
            
        total = subtotal - discount
        
        self.subtotal_var.set(f"{subtotal:.2f} ₽")
        self.discount_var.set(f"{discount:.2f} ₽")
        self.total_var.set(f"{total:.2f} ₽")
        
    def remove_item(self):
        """Удаление позиции из чека"""
        selection = self.receipt_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите позицию для удаления")
            return
            
        item = self.receipt_tree.item(selection[0])
        item_index = int(item['tags'][0])
        
        if messagebox.askyesno("Подтверждение", f"Удалить '{item['values'][0]}'?"):
            del self.current_sale_items[item_index]
            self.update_receipt_display()
            
    def change_quantity(self):
        """Изменение количества товара"""
        selection = self.receipt_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите позицию для изменения")
            return
            
        item = self.receipt_tree.item(selection[0])
        item_index = int(item['tags'][0])
        sale_item = self.current_sale_items[item_index]
        
        # Диалог ввода количества
        new_quantity = tk.simpledialog.askfloat("Изменение количества", 
                                               f"Новое количество для '{sale_item['name']}':",
                                               initialvalue=sale_item['quantity'],
                                               minvalue=0.1)
        if new_quantity:
            # Проверка остатков
            product = self.db.fetch_one('SELECT * FROM products WHERE id = ?', (sale_item['product_id'],))
            if product['quantity'] >= new_quantity:
                sale_item['quantity'] = new_quantity
                sale_item['total'] = new_quantity * sale_item['price']
                self.update_receipt_display()
            else:
                messagebox.showwarning("Недостаточно товара", 
                                     f"На складе только {product['quantity']} {product['unit']}")
                
    def clear_receipt(self):
        """Очистка чека"""
        if self.current_sale_items and messagebox.askyesno("Подтверждение", "Очистить весь чек?"):
            self.current_sale_items.clear()
            self.current_customer = None
            self.customer_label.config(text="Не выбран", foreground='gray')
            # Сброс ручной скидки
            self.manual_discount_percent = 0.0
            if hasattr(self, 'manual_discount_var'):
                self.manual_discount_var.set(0.0)
            self.update_receipt_display()
            
    def select_customer(self):
        """Выбор клиента"""
        dialog = CustomerSelectDialog(self.frame, self.db)
        if dialog.selected_customer:
            self.current_customer = dialog.selected_customer
            self.customer_label.config(text=dialog.selected_customer['name'], foreground='black')
            self.update_receipt_display()  # Пересчёт скидки
            
    def process_payment(self):
        """Обработка оплаты"""
        if not self.current_sale_items:
            messagebox.showwarning("Внимание", "Добавьте товары в чек")
            return
            
        if not self.main_app.current_shift:
            messagebox.showerror("Ошибка", "Откройте смену для проведения продаж")
            return
            
        # Подтверждение оплаты
        total = sum(item['total'] for item in self.current_sale_items)
        discount = 0
        if self.current_customer and self.current_customer.get('discount_percent', 0) > 0:
            discount = total * self.current_customer['discount_percent'] / 100
            
        final_amount = total - discount
        
        # Обработка онлайн-платежей через YooKassa
        if self.payment_method_var.get() == "Банковская карта" and self.db.get_setting('yookassa_enabled') == '1':
            if self.process_yookassa_payment(final_amount):
                # Платеж через YooKassa успешен, продолжаем
                pass
            else:
                messagebox.showerror("Ошибка", "Ошибка обработки платежа через YooKassa")
                return
        
        if messagebox.askyesno("Подтверждение оплаты", 
                              f"Сумма к оплате: {final_amount:.2f} ₽\n"
                              f"Способ оплаты: {self.payment_method_var.get()}\n\n"
                              "Подтвердить оплату?"):
            
            try:
                # Создание продажи в БД
                shift = self.main_app.current_shift
                customer_id = self.current_customer['id'] if self.current_customer else None
                
                sale_id = self.db.create_sale(
                    shift_id=shift['id'],
                    customer_id=customer_id,
                    items=self.current_sale_items,
                    payment_method=self.payment_method_var.get(),
                    discount_amount=discount
                )
                
                # Печать чека (заглушка)
                self.print_receipt(sale_id, final_amount)
                
                # Обновление наличности в кассе
                if self.payment_method_var.get() == "Наличные":
                    shift['current_amount'] += final_amount
                    self.main_app.cash_amount_label.config(text=f"{shift['current_amount']:.2f} ₽")
                
                # Очистка чека
                self.current_sale_items.clear()
                self.current_customer = None
                self.customer_label.config(text="Не выбран", foreground='gray')
                # Сброс ручной скидки
                self.manual_discount_percent = 0.0
                if hasattr(self, 'manual_discount_var'):
                    self.manual_discount_var.set(0.0)
                self.update_receipt_display()
                
                self.main_app.status_label.config(text=f"Продажа #{sale_id} завершена")
                messagebox.showinfo("Успех", f"Продажа #{sale_id} успешно проведена!")
                
            except Exception as e:
                messagebox.showerror("Ошибка", f"Ошибка проведения продажи: {str(e)}")
                
    def print_receipt(self, sale_id, amount):
        """Печать чека"""
        # Сначала печатаем в консоль
        print(f"=== ЧЕК №{sale_id} ===")
        print(f"Время: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}")
        if self.current_customer:
            print(f"Клиент: {self.current_customer['name']}")
        for item in self.current_sale_items:
            print(f"{item['name']} - {item['quantity']:.1f} x {item['price']:.2f} = {item['total']:.2f} ₽")
        print(f"ИТОГО: {amount:.2f} ₽")
        print(f"Способ оплаты: {self.payment_method_var.get()}")
        print("===================")
        
        # Попытка печати на фискальном принтере
        try:
            if self.db.get_setting('fiscal_printer') == '1':
                fiscal_type = self.db.get_setting('fiscal_type') or 'Атол'
                fiscal_port = self.db.get_setting('fiscal_port') or 'COM1'
                fiscal_speed = int(self.db.get_setting('fiscal_speed') or '9600')
                
                printer = FiscalPrinter(fiscal_type, fiscal_port, fiscal_speed)
                
                receipt_data = {
                    'id': sale_id,
                    'date': datetime.now().strftime('%d.%m.%Y %H:%M:%S'),
                    'items': self.current_sale_items,
                    'total': amount,
                    'payment_method': self.payment_method_var.get(),
                    'customer': self.current_customer['name'] if self.current_customer else None
                }
                
                if printer.print_receipt(receipt_data):
                    print("Чек отправлен на фискальный принтер")
                else:
                    print("Ошибка печати на фискальном принтере")
                    messagebox.showwarning("Внимание", 
                                         "Ошибка печати фискального чека!\n"
                                         "Обратитесь к администратору.")
                    
        except Exception as e:
            print(f"Ошибка при попытке печати на фискальном принтере: {e}")
            
    def process_yookassa_payment(self, amount):
        """Обработка платежа через YooKassa"""
        try:
            shop_id = self.db.get_setting('yookassa_shop_id')
            secret_key = self.db.get_setting('yookassa_secret_key')
            
            if not shop_id or not secret_key:
                messagebox.showerror("Ошибка", "YooKassa не настроена. Проверьте настройки.")
                return False
                
            yookassa = YooKassaPayments(shop_id, secret_key)
            
            # Создание платежа
            payment = yookassa.create_payment(
                amount=amount,
                description=f"Оплата в кассе VetPOS",
                return_url="http://localhost:5000/payment/success"
            )
            
            if payment:
                payment_id = payment.get('id')
                payment_status = payment.get('status', 'unknown')
                
                # Проверка статуса платежа
                if payment_status in ['pending', 'waiting_for_capture']:
                    messagebox.showinfo("YooKassa", 
                                       f"Платеж создан: {payment_id}\n"
                                       f"Статус: {payment_status}")
                    return True
                elif payment_status == 'succeeded':
                    messagebox.showinfo("Успех", "Платеж успешно проведен")
                    return True
                else:
                    messagebox.showerror("Ошибка", f"Ошибка платежа: {payment_status}")
                    return False
            else:
                messagebox.showerror("Ошибка", "Не удалось создать платеж в YooKassa")
                return False
                
        except Exception as e:
            print(f"Ошибка YooKassa платежа: {e}")
            return False
            
    def apply_manual_discount(self):
        """Применение ручной скидки"""
        try:
            discount = self.manual_discount_var.get()
            if 0 <= discount <= 100:
                self.manual_discount_percent = discount
                self.update_receipt_display()
                messagebox.showinfo("Скидка", f"Применена скидка {discount}%")
            else:
                messagebox.showerror("Ошибка", "Скидка должна быть от 0 до 100%")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Неверное значение скидки: {str(e)}")
            
    def process_return(self):
        """Обработка возврата товара"""
        dialog = ReturnDialog(self.frame, self.db)
        if dialog.result:
            # Обновление отображения после возврата
            self.main_app.status_label.config(text="Возврат обработан")
            
    def check_stock_availability(self, product, quantity):
        """Проверка доступности товара на складе"""
        if product['quantity'] < quantity:
            return False, f"Недостаточно товара на складе. Доступно: {product['quantity']}"
        return True, ""
        
    def hold_receipt(self):
        """Отложить чек"""
        messagebox.showinfo("Отложенный чек", "Функция в разработке")
        
    def scan_barcode(self):
        """Сканирование штрихкода"""
        messagebox.showinfo("Сканер", "Подключите сканер штрихкодов и сканируйте товар")
        
    def search_products(self):
        """Расширенный поиск товаров"""
        messagebox.showinfo("Поиск", "Используйте поле поиска выше")
        
    def add_manual_item(self):
        """Добавление товара вручную"""
        messagebox.showinfo("Ручное добавление", "Функция в разработке")


class CustomerSelectDialog:
    def __init__(self, parent, db):
        self.db = db
        self.selected_customer = None
        
        # Создание окна
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("Выбор клиента")
        self.dialog.geometry("600x400")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        self.create_interface()
        self.load_customers()
        
        self.dialog.wait_window()
        
    def create_interface(self):
        """Создание интерфейса выбора клиента"""
        # Поиск
        search_frame = ttk.Frame(self.dialog)
        search_frame.pack(fill=tk.X, padx=10, pady=10)
        
        ttk.Label(search_frame, text="Поиск:").pack(side=tk.LEFT)
        self.search_var = tk.StringVar()
        self.search_var.trace('w', self.on_search)
        ttk.Entry(search_frame, textvariable=self.search_var, width=30).pack(side=tk.LEFT, padx=10)
        
        # Таблица клиентов
        table_frame = ttk.Frame(self.dialog)
        table_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        columns = ('ID', 'Имя', 'Телефон', 'Скидка')
        self.customers_tree = ttk.Treeview(table_frame, columns=columns, show='headings')
        
        for col in columns:
            self.customers_tree.heading(col, text=col)
            
        scrollbar = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.customers_tree.yview)
        self.customers_tree.configure(yscrollcommand=scrollbar.set)
        
        self.customers_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Кнопки
        btn_frame = ttk.Frame(self.dialog)
        btn_frame.pack(fill=tk.X, padx=10, pady=10)
        
        ttk.Button(btn_frame, text="Выбрать", command=self.select_customer).pack(side=tk.RIGHT, padx=5)
        ttk.Button(btn_frame, text="Отмена", command=self.dialog.destroy).pack(side=tk.RIGHT, padx=5)
        ttk.Button(btn_frame, text="Без клиента", command=self.no_customer).pack(side=tk.LEFT)
        
        # Обработчики
        self.customers_tree.bind('<Double-1>', lambda e: self.select_customer())
        
    def load_customers(self):
        """Загрузка клиентов"""
        for item in self.customers_tree.get_children():
            self.customers_tree.delete(item)
            
        customers = self.db.get_all_customers()
        for customer in customers:
            self.customers_tree.insert('', 'end', values=(
                customer['id'],
                customer['name'],
                customer['phone'] or '',
                f"{customer['discount_percent']:.0f}%"
            ), tags=(customer['id'],))
            
    def on_search(self, *args):
        """Поиск клиентов"""
        search_term = self.search_var.get()
        
        for item in self.customers_tree.get_children():
            self.customers_tree.delete(item)
            
        if search_term:
            customers = self.db.search_customers(search_term)
        else:
            customers = self.db.get_all_customers()
            
        for customer in customers:
            self.customers_tree.insert('', 'end', values=(
                customer['id'],
                customer['name'],
                customer['phone'] or '',
                f"{customer['discount_percent']:.0f}%"
            ), tags=(customer['id'],))
            
    def select_customer(self):
        """Выбор клиента"""
        selection = self.customers_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите клиента")
            return
            
        item = self.customers_tree.item(selection[0])
        customer_id = item['values'][0]
        
        self.selected_customer = self.db.fetch_one('SELECT * FROM customers WHERE id = ?', (customer_id,))
        self.dialog.destroy()
        
    def no_customer(self):
        """Продажа без клиента"""
        self.selected_customer = None
        self.dialog.destroy()