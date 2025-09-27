"""
Диалог обработки возврата товара
"""

import tkinter as tk
from tkinter import ttk, messagebox


class ReturnDialog:
    """Диалог обработки возврата товара"""
    
    def __init__(self, parent, db):
        self.parent = parent
        self.db = db
        self.result = None
        
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("Возврат товара")
        self.dialog.geometry("600x500")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        self.dialog.resizable(False, False)
        
        self.create_interface()
        
        # Центрирование окна
        self.dialog.geometry("+%d+%d" % (
            parent.winfo_rootx() + 100,
            parent.winfo_rooty() + 100
        ))
        
    def create_interface(self):
        """Создание интерфейса возврата"""
        main_frame = ttk.Frame(self.dialog, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Поиск чека
        search_frame = ttk.LabelFrame(main_frame, text="Поиск чека", padding="5")
        search_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(search_frame, text="Номер чека:").grid(row=0, column=0, sticky=tk.W)
        self.sale_id_var = tk.StringVar()
        sale_entry = ttk.Entry(search_frame, textvariable=self.sale_id_var, width=20)
        sale_entry.grid(row=0, column=1, padx=5)
        
        ttk.Button(search_frame, text="Найти", 
                  command=self.search_sale).grid(row=0, column=2, padx=5)
        
        # Информация о чеке
        info_frame = ttk.LabelFrame(main_frame, text="Информация о чеке", padding="5")
        info_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Детали чека
        details_frame = ttk.Frame(info_frame)
        details_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.sale_info_var = tk.StringVar(value="Чек не найден")
        ttk.Label(details_frame, textvariable=self.sale_info_var, 
                 font=('Segoe UI', 10, 'bold')).pack(anchor=tk.W)
        
        # Таблица товаров в чеке
        table_frame = ttk.Frame(info_frame)
        table_frame.pack(fill=tk.BOTH, expand=True)
        
        columns = ('Товар', 'Кол-во', 'Цена', 'Сумма')
        self.items_tree = ttk.Treeview(table_frame, columns=columns, show='headings', height=10)
        
        # Настройка колонок
        self.items_tree.heading('Товар', text='Товар')
        self.items_tree.heading('Кол-во', text='Кол-во')
        self.items_tree.heading('Цена', text='Цена')
        self.items_tree.heading('Сумма', text='Сумма')
        
        self.items_tree.column('Товар', width=200, minwidth=150)
        self.items_tree.column('Кол-во', width=100, minwidth=80)
        self.items_tree.column('Цена', width=100, minwidth=80)
        self.items_tree.column('Сумма', width=120, minwidth=100)
            
        scrollbar = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.items_tree.yview)
        self.items_tree.configure(yscrollcommand=scrollbar.set)
        
        self.items_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Кнопки
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X, pady=(10, 0))
        
        ttk.Button(btn_frame, text="🔄 Полный возврат", 
                  command=self.full_return).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="📝 Частичный возврат", 
                  command=self.partial_return).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="❌ Отмена", 
                  command=self.cancel).pack(side=tk.RIGHT, padx=5)
                  
        # Подсказка для пользователя
        hint_frame = ttk.Frame(main_frame)
        hint_frame.pack(fill=tk.X, pady=(5, 0))
        
        hint_text = "💡 Для частичного возврата выберите товар в таблице и нажмите 'Частичный возврат'"
        ttk.Label(hint_frame, text=hint_text, foreground='gray', 
                 font=('Segoe UI', 9)).pack(anchor=tk.W)
        
    def search_sale(self):
        """Поиск чека по номеру"""
        try:
            sale_id = int(self.sale_id_var.get())
            
            # Получение данных чека
            sale = self.db.fetch_one('''
                SELECT s.*, u.name as cashier_name 
                FROM sales s
                LEFT JOIN shifts sh ON s.shift_id = sh.id
                LEFT JOIN users u ON sh.cashier_id = u.id
                WHERE s.id = ?
            ''', (sale_id,))
            
            if not sale:
                messagebox.showerror("Ошибка", "Чек не найден")
                return
                
            # Получение уже возвращенных товаров по позициям чека
            returned_items = self.db.fetch_all('''
                SELECT ri.sale_item_id, SUM(ri.quantity) as returned_quantity
                FROM returns r
                JOIN return_items ri ON r.id = ri.return_id
                WHERE r.sale_id = ?
                GROUP BY ri.sale_item_id
            ''', (sale_id,))
                
            # Получение позиций чека
            items = self.db.fetch_all('''
                SELECT si.*, p.name, p.unit 
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.sale_id = ?
            ''', (sale_id,))
            
            # Заполнение информации о чеке
            sale_info = (f"Чек №{sale['id']} от {sale['created_at']}\n"
                        f"Кассир: {sale.get('cashier_name', 'Неизвестно')}\n"
                        f"Сумма: {sale['final_amount']:.2f} ₽\n"
                        f"Способ оплаты: {sale['payment_method']}")
            self.sale_info_var.set(sale_info)
            
            # Создание словаря возвращенных количеств по sale_item_id
            returned_quantities = {item['sale_item_id']: item['returned_quantity'] for item in returned_items}
            
            # Заполнение таблицы с учетом возвратов
            for item in self.items_tree.get_children():
                self.items_tree.delete(item)
                
            for item in items:
                returned_qty = returned_quantities.get(item['id'], 0)
                available_qty = item['quantity'] - returned_qty
                
                if available_qty > 0:
                    self.items_tree.insert('', 'end', values=(
                        item['name'],
                        f"{available_qty:.1f}/{item['quantity']:.1f} {item['unit']}",
                        f"{item['price']:.2f} ₽",
                        f"{available_qty * item['price']:.2f} ₽"
                    ), tags=(item['id'],))  # Сохраняем sale_item_id в тегах
                else:
                    # Показываем полностью возвращенные товары серым цветом
                    item_id = self.items_tree.insert('', 'end', values=(
                        f"{item['name']} (возвращен)",
                        f"0/{item['quantity']:.1f} {item['unit']}",
                        f"{item['price']:.2f} ₽",
                        "0.00 ₽"
                    ), tags=(item['id'],))
                    self.items_tree.set(item_id, '#0', 'returned')
                
            self.current_sale = sale
            self.current_items = items
            self.returned_quantities = returned_quantities
            self.items_dict = {item['id']: item for item in items}  # Словарь для быстрого поиска
            
        except ValueError:
            messagebox.showerror("Ошибка", "Введите корректный номер чека")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка поиска чека: {str(e)}")
            
    def full_return(self):
        """Полный возврат чека"""
        if not hasattr(self, 'current_sale'):
            messagebox.showwarning("Внимание", "Сначала найдите чек")
            return
            
        if messagebox.askyesno("Подтверждение", 
                              f"Вернуть весь чек №{self.current_sale['id']} на сумму {self.current_sale['final_amount']:.2f} ₽?"):
            try:
                # Создание записи возврата
                return_id = self.db.execute_query('''
                    INSERT INTO returns (sale_id, total_amount, reason)
                    VALUES (?, ?, 'Полный возврат')
                ''', (self.current_sale['id'], self.current_sale['final_amount']))
                
                # Возврат товаров на склад и создание записей
                for item in self.current_items:
                    returned_qty = self.returned_quantities.get(item['id'], 0)
                    remaining_qty = item['quantity'] - returned_qty
                    
                    if remaining_qty > 0:
                        self.db.execute_query('''
                            UPDATE products 
                            SET quantity = quantity + ? 
                            WHERE id = ?
                        ''', (remaining_qty, item['product_id']))
                        
                        # Создание записи движения товара
                        self.db.execute_query('''
                            INSERT INTO inventory_movements 
                            (product_id, movement_type, quantity, reason, document_number)
                            VALUES (?, 'in', ?, ?, ?)
                        ''', (item['product_id'], remaining_qty, 
                             f"Возврат по чеку №{self.current_sale['id']}", 
                             f"return_{self.current_sale['id']}"))
                        
                        # Создание записи позиции возврата
                        self.db.execute_query('''
                            INSERT INTO return_items (return_id, sale_item_id, product_id, quantity, price, total_amount)
                            VALUES (?, ?, ?, ?, ?, ?)
                        ''', (return_id, item['id'], item['product_id'], remaining_qty, 
                             item['price'], remaining_qty * item['price']))
                
                # Обновление статуса чека
                self.db.execute_query('''
                    UPDATE sales SET status = 'returned' WHERE id = ?
                ''', (self.current_sale['id'],))
                
                self.db.commit()
                
                messagebox.showinfo("Успех", 
                                   f"Возврат чека №{self.current_sale['id']} выполнен\n"
                                   f"Сумма возврата: {self.current_sale['final_amount']:.2f} ₽")
                self.result = True
                self.dialog.destroy()
                
            except Exception as e:
                self.db.rollback()
                messagebox.showerror("Ошибка", f"Ошибка возврата: {str(e)}")
                
    def partial_return(self):
        """Частичный возврат товара"""
        if not hasattr(self, 'current_sale'):
            messagebox.showwarning("Внимание", "Сначала найдите чек")
            return
            
        # Получение выбранного товара
        selection = self.items_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите товар для частичного возврата")
            return
            
        # Получение sale_item_id из тегов
        selected_tree_item = self.items_tree.item(selection[0])
        sale_item_id = int(selected_tree_item['tags'][0])
        selected_item = self.items_dict.get(sale_item_id)
                
        if not selected_item:
            messagebox.showerror("Ошибка", "Ошибка определения товара")
            return
            
        # Проверка что товар еще можно вернуть
        returned_qty = self.returned_quantities.get(selected_item['id'], 0)
        available_qty = selected_item['quantity'] - returned_qty
        
        if available_qty <= 0:
            messagebox.showwarning("Внимание", "Этот товар уже полностью возвращен")
            return
            
        # Диалог ввода количества для возврата
        partial_dialog = PartialReturnDialog(self.dialog, selected_item, self.db)
        if partial_dialog.result:
            return_quantity = partial_dialog.return_quantity
            return_amount = return_quantity * selected_item['price']
            
            try:
                # Возврат товара на склад
                self.db.execute_query('''
                    UPDATE products 
                    SET quantity = quantity + ? 
                    WHERE id = ?
                ''', (return_quantity, selected_item['product_id']))
                
                # Создание записи движения товара
                self.db.execute_query('''
                    INSERT INTO inventory_movements 
                    (product_id, movement_type, quantity, reason, document_number)
                    VALUES (?, 'in', ?, ?, ?)
                ''', (selected_item['product_id'], return_quantity, 
                     f"Частичный возврат по чеку №{self.current_sale['id']}", 
                     f"partial_return_{self.current_sale['id']}"))
                
                # Создание записи возврата
                return_id = self.db.execute_query('''
                    INSERT INTO returns (sale_id, total_amount, reason)
                    VALUES (?, ?, ?)
                ''', (self.current_sale['id'], return_amount, 
                     f"Частичный возврат: {selected_item['name']} ({return_quantity} шт)"))
                
                # Создание записи позиции возврата
                self.db.execute_query('''
                    INSERT INTO return_items (return_id, sale_item_id, product_id, quantity, price, total_amount)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (return_id, selected_item['id'], selected_item['product_id'], 
                     return_quantity, selected_item['price'], return_amount))
                
                self.db.commit()
                
                messagebox.showinfo("Успех", 
                                   f"Частичный возврат выполнен\n"
                                   f"Товар: {selected_item['name']}\n"
                                   f"Количество: {return_quantity}\n"
                                   f"Сумма возврата: {return_amount:.2f} ₽")
                self.result = True
                self.dialog.destroy()
                
            except Exception as e:
                self.db.rollback()
                messagebox.showerror("Ошибка", f"Ошибка частичного возврата: {str(e)}")
        
    def cancel(self):
        """Отмена"""
        self.dialog.destroy()


class PartialReturnDialog:
    """Диалог для ввода количества при частичном возврате"""
    
    def __init__(self, parent, item, db):
        self.parent = parent
        self.item = item
        self.db = db
        self.result = False
        self.return_quantity = 0
        
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("Частичный возврат")
        self.dialog.geometry("400x250")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        self.dialog.resizable(False, False)
        
        self.create_interface()
        
        # Центрирование окна
        self.dialog.geometry("+%d+%d" % (
            parent.winfo_rootx() + 100,
            parent.winfo_rooty() + 100
        ))
        
    def create_interface(self):
        """Создание интерфейса частичного возврата"""
        main_frame = ttk.Frame(self.dialog, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Информация о товаре
        info_frame = ttk.LabelFrame(main_frame, text="Информация о товаре", padding="10")
        info_frame.pack(fill=tk.X, pady=(0, 15))
        
        ttk.Label(info_frame, text=f"Товар: {self.item['name']}", 
                 font=('Segoe UI', 10, 'bold')).pack(anchor=tk.W)
        ttk.Label(info_frame, text=f"Цена: {self.item['price']:.2f} ₽").pack(anchor=tk.W)
        ttk.Label(info_frame, text=f"Продано: {self.item['quantity']:.1f} {self.item['unit']}").pack(anchor=tk.W)
        ttk.Label(info_frame, text=f"Общая сумма: {self.item['total_amount']:.2f} ₽").pack(anchor=tk.W)
        
        # Ввод количества для возврата
        quantity_frame = ttk.LabelFrame(main_frame, text="Количество для возврата", padding="10")
        quantity_frame.pack(fill=tk.X, pady=(0, 15))
        
        ttk.Label(quantity_frame, text="Количество:").grid(row=0, column=0, sticky=tk.W, padx=(0, 10))
        
        self.quantity_var = tk.DoubleVar(value=self.item['quantity'])
        quantity_spinbox = ttk.Spinbox(quantity_frame, textvariable=self.quantity_var, 
                                      from_=0.1, to=self.item['quantity'], 
                                      increment=0.1, width=15)
        quantity_spinbox.grid(row=0, column=1)
        
        ttk.Label(quantity_frame, text=self.item['unit']).grid(row=0, column=2, sticky=tk.W, padx=(5, 0))
        
        # Расчет суммы возврата
        self.return_amount_var = tk.StringVar()
        self.update_return_amount()
        
        ttk.Label(quantity_frame, text="Сумма возврата:").grid(row=1, column=0, sticky=tk.W, pady=(10, 0))
        ttk.Label(quantity_frame, textvariable=self.return_amount_var, 
                 font=('Segoe UI', 10, 'bold'), foreground='red').grid(row=1, column=1, columnspan=2, 
                                                                        sticky=tk.W, pady=(10, 0))
        
        # Обновление суммы при изменении количества
        self.quantity_var.trace('w', self.on_quantity_change)
        
        # Кнопки
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X)
        
        ttk.Button(btn_frame, text="✅ Подтвердить", 
                  command=self.confirm).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="❌ Отмена", 
                  command=self.cancel).pack(side=tk.RIGHT, padx=5)
        
    def on_quantity_change(self, *args):
        """Обработчик изменения количества"""
        self.update_return_amount()
        
    def update_return_amount(self):
        """Обновление суммы возврата"""
        try:
            quantity = self.quantity_var.get()
            amount = quantity * self.item['price']
            self.return_amount_var.set(f"{amount:.2f} ₽")
        except:
            self.return_amount_var.set("0.00 ₽")
            
    def confirm(self):
        """Подтверждение частичного возврата"""
        try:
            quantity = self.quantity_var.get()
            
            if quantity <= 0:
                messagebox.showerror("Ошибка", "Количество должно быть больше 0")
                return
                
            if quantity > self.item['quantity']:
                messagebox.showerror("Ошибка", "Количество для возврата не может быть больше проданного")
                return
                
            self.return_quantity = quantity
            self.result = True
            self.dialog.destroy()
            
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка валидации: {str(e)}")
            
    def cancel(self):
        """Отмена"""
        self.dialog.destroy()