"""
Модуль управления товарами
"""

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
from datetime import datetime
from .integrations import MoySkladAPI


class ProductsModule:
    def __init__(self, parent, db, main_app):
        self.parent = parent
        self.db = db
        self.main_app = main_app
        
        self.frame = ttk.Frame(parent)
        self.create_interface()
        self.load_products()
        
    def create_interface(self):
        """Создание интерфейса модуля товаров"""
        # Панель управления
        control_frame = ttk.Frame(self.frame)
        control_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Поиск
        ttk.Label(control_frame, text="Поиск:").pack(side=tk.LEFT, padx=5)
        self.search_var = tk.StringVar()
        self.search_var.trace('w', self.on_search_change)
        search_entry = ttk.Entry(control_frame, textvariable=self.search_var, width=30)
        search_entry.pack(side=tk.LEFT, padx=5)
        
        # Кнопки
        btn_frame = ttk.Frame(control_frame)
        btn_frame.pack(side=tk.RIGHT, padx=5)
        
        ttk.Button(btn_frame, text="Добавить товар", 
                  command=self.add_product).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="Редактировать", 
                  command=self.edit_product).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="Удалить", 
                  command=self.delete_product).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="Обновить", 
                  command=self.load_products).pack(side=tk.LEFT, padx=2)
        
        # Таблица товаров
        self.create_products_table()
        
    def create_products_table(self):
        """Создание таблицы товаров"""
        # Контейнер для таблицы
        table_frame = ttk.Frame(self.frame)
        table_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Создание Treeview
        columns = ('ID', 'Штрихкод', 'Название', 'Цена', 'Себестоимость', 
                  'Категория', 'Остаток', 'Единица')
        
        self.products_tree = ttk.Treeview(table_frame, columns=columns, show='headings', height=15)
        
        # Настройка колонок
        column_widths = [50, 120, 300, 100, 100, 150, 80, 80]
        for i, (col, width) in enumerate(zip(columns, column_widths)):
            self.products_tree.heading(col, text=col)
            self.products_tree.column(col, width=width, minwidth=width)
        
        # Прокрутка
        scrollbar_v = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.products_tree.yview)
        scrollbar_h = ttk.Scrollbar(table_frame, orient=tk.HORIZONTAL, command=self.products_tree.xview)
        self.products_tree.configure(yscrollcommand=scrollbar_v.set, xscrollcommand=scrollbar_h.set)
        
        # Размещение
        self.products_tree.grid(row=0, column=0, sticky='nsew')
        scrollbar_v.grid(row=0, column=1, sticky='ns')
        scrollbar_h.grid(row=1, column=0, sticky='ew')
        
        table_frame.grid_rowconfigure(0, weight=1)
        table_frame.grid_columnconfigure(0, weight=1)
        
        # Обработчик двойного клика
        self.products_tree.bind('<Double-1>', lambda e: self.edit_product())
        
    def load_products(self):
        """Загрузка товаров в таблицу"""
        # Очистка таблицы
        for item in self.products_tree.get_children():
            self.products_tree.delete(item)
            
        # Загрузка данных
        products = self.db.get_all_products()
        
        for product in products:
            self.products_tree.insert('', 'end', values=(
                product['id'],
                product['barcode'] or '',
                product['name'],
                f"{product['price']:.2f} ₽",
                f"{product['cost_price']:.2f} ₽" if product['cost_price'] else '',
                product['category'] or '',
                f"{product['quantity']:.1f}",
                product['unit']
            ))
            
        self.main_app.status_label.config(text=f"Загружено товаров: {len(products)}")
        
    def on_search_change(self, *args):
        """Обработчик изменения поиска"""
        search_term = self.search_var.get()
        
        if len(search_term) >= 2:
            self.search_products(search_term)
        elif len(search_term) == 0:
            self.load_products()
            
    def search_products(self, search_term):
        """Поиск товаров"""
        # Очистка таблицы
        for item in self.products_tree.get_children():
            self.products_tree.delete(item)
            
        # Поиск и загрузка
        products = self.db.search_products(search_term)
        
        for product in products:
            self.products_tree.insert('', 'end', values=(
                product['id'],
                product['barcode'] or '',
                product['name'],
                f"{product['price']:.2f} ₽",
                f"{product['cost_price']:.2f} ₽" if product['cost_price'] else '',
                product['category'] or '',
                f"{product['quantity']:.1f}",
                product['unit']
            ))
            
    def add_product(self):
        """Добавление нового товара"""
        dialog = ProductDialog(self.frame, self.db, "Добавление товара")
        if dialog.result:
            self.load_products()
            
    def edit_product(self):
        """Редактирование товара"""
        selection = self.products_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите товар для редактирования")
            return
            
        item = self.products_tree.item(selection[0])
        product_id = item['values'][0]
        
        # Получение полных данных товара
        product = self.db.fetch_one('SELECT * FROM products WHERE id = ?', (product_id,))
        
        dialog = ProductDialog(self.frame, self.db, "Редактирование товара", product)
        if dialog.result:
            self.load_products()
            
    def delete_product(self):
        """Удаление товара"""
        selection = self.products_tree.selection()
        if not selection:
            messagebox.showwarning("Внимание", "Выберите товар для удаления")
            return
            
        item = self.products_tree.item(selection[0])
        product_name = item['values'][2]
        
        if messagebox.askyesno("Подтверждение", f"Удалить товар '{product_name}'?"):
            product_id = item['values'][0]
            self.db.execute_query('UPDATE products SET is_active = 0 WHERE id = ?', (product_id,))
            self.db.commit()
            self.load_products()


class ProductDialog:
    def __init__(self, parent, db, title, product=None):
        self.db = db
        self.result = False
        self.product = product
        
        # Создание окна
        self.dialog = tk.Toplevel(parent)
        self.dialog.title(title)
        self.dialog.geometry("500x400")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        # Центрирование
        self.dialog.geometry("+%d+%d" % (
            parent.winfo_rootx() + 100,
            parent.winfo_rooty() + 50
        ))
        
        self.create_form()
        
        # Если редактирование - заполняем поля
        if product:
            self.fill_form()
            
        self.dialog.wait_window()
        
    def create_form(self):
        """Создание формы товара"""
        # Основная рамка
        main_frame = ttk.Frame(self.dialog)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Поля формы
        row = 0
        
        # Штрихкод
        ttk.Label(main_frame, text="Штрихкод:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.barcode_var = tk.StringVar()
        ttk.Entry(main_frame, textvariable=self.barcode_var, width=40).grid(row=row, column=1, pady=5, sticky=tk.W+tk.E)
        row += 1
        
        # Название
        ttk.Label(main_frame, text="* Название:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.name_var = tk.StringVar()
        ttk.Entry(main_frame, textvariable=self.name_var, width=40).grid(row=row, column=1, pady=5, sticky=tk.W+tk.E)
        row += 1
        
        # Описание
        ttk.Label(main_frame, text="Описание:").grid(row=row, column=0, sticky=tk.W+tk.N, pady=5)
        self.description_text = tk.Text(main_frame, width=40, height=3)
        self.description_text.grid(row=row, column=1, pady=5, sticky=tk.W+tk.E)
        row += 1
        
        # Цена продажи
        ttk.Label(main_frame, text="* Цена продажи (₽):").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.price_var = tk.StringVar()
        ttk.Entry(main_frame, textvariable=self.price_var, width=20).grid(row=row, column=1, pady=5, sticky=tk.W)
        row += 1
        
        # Себестоимость
        ttk.Label(main_frame, text="Себестоимость (₽):").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.cost_price_var = tk.StringVar()
        ttk.Entry(main_frame, textvariable=self.cost_price_var, width=20).grid(row=row, column=1, pady=5, sticky=tk.W)
        row += 1
        
        # Категория
        ttk.Label(main_frame, text="Категория:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.category_var = tk.StringVar()
        category_combo = ttk.Combobox(main_frame, textvariable=self.category_var, width=37)
        category_combo['values'] = ('Корма', 'Витамины', 'Аксессуары', 'Уход', 'Игрушки', 'Лекарства', 'Услуги')
        category_combo.grid(row=row, column=1, pady=5, sticky=tk.W+tk.E)
        row += 1
        
        # Единица измерения
        ttk.Label(main_frame, text="Единица:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.unit_var = tk.StringVar(value="шт")
        unit_combo = ttk.Combobox(main_frame, textvariable=self.unit_var, width=15)
        unit_combo['values'] = ('шт', 'кг', 'л', 'м', 'уп', 'услуга')
        unit_combo.grid(row=row, column=1, pady=5, sticky=tk.W)
        row += 1
        
        # Количество
        ttk.Label(main_frame, text="Количество:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.quantity_var = tk.StringVar(value="0")
        ttk.Entry(main_frame, textvariable=self.quantity_var, width=20).grid(row=row, column=1, pady=5, sticky=tk.W)
        row += 1
        
        # Минимальный остаток
        ttk.Label(main_frame, text="Мин. остаток:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.min_quantity_var = tk.StringVar(value="0")
        ttk.Entry(main_frame, textvariable=self.min_quantity_var, width=20).grid(row=row, column=1, pady=5, sticky=tk.W)
        row += 1
        
        # Настройка растяжения колонки
        main_frame.grid_columnconfigure(1, weight=1)
        
        # Кнопки
        btn_frame = ttk.Frame(self.dialog)
        btn_frame.pack(fill=tk.X, padx=10, pady=10)
        
        ttk.Button(btn_frame, text="Сохранить", command=self.save_product).pack(side=tk.RIGHT, padx=5)
        ttk.Button(btn_frame, text="Отмена", command=self.dialog.destroy).pack(side=tk.RIGHT, padx=5)
        
    def fill_form(self):
        """Заполнение формы данными товара"""
        if self.product:
            self.barcode_var.set(self.product['barcode'] or '')
            self.name_var.set(self.product['name'])
            self.description_text.insert(1.0, self.product['description'] or '')
            self.price_var.set(str(self.product['price']))
            self.cost_price_var.set(str(self.product['cost_price'] or ''))
            self.category_var.set(self.product['category'] or '')
            self.unit_var.set(self.product['unit'])
            self.quantity_var.set(str(self.product['quantity']))
            self.min_quantity_var.set(str(self.product['min_quantity']))
            
    def save_product(self):
        """Сохранение товара"""
        # Валидация
        if not self.name_var.get().strip():
            messagebox.showerror("Ошибка", "Введите название товара")
            return
            
        try:
            price = float(self.price_var.get())
            if price <= 0:
                raise ValueError()
        except ValueError:
            messagebox.showerror("Ошибка", "Введите корректную цену")
            return
            
        try:
            cost_price = float(self.cost_price_var.get()) if self.cost_price_var.get() else 0
        except ValueError:
            cost_price = 0
            
        try:
            quantity = float(self.quantity_var.get())
            min_quantity = float(self.min_quantity_var.get())
        except ValueError:
            messagebox.showerror("Ошибка", "Введите корректное количество")
            return
            
        # Подготовка данных
        barcode = self.barcode_var.get().strip() or None
        name = self.name_var.get().strip()
        description = self.description_text.get(1.0, tk.END).strip()
        category = self.category_var.get().strip() or None
        unit = self.unit_var.get()
        
        try:
            if self.product:
                # Обновление
                self.db.update_product(self.product['id'], (
                    name, description, price, cost_price, category, unit, quantity, min_quantity
                ))
                
                # Синхронизация с МойСклад если включена
                self.sync_to_moysklad({
                    'id': self.product['id'],
                    'name': name,
                    'description': description,
                    'price': price,
                    'barcode': barcode
                })
                
                messagebox.showinfo("Успех", "Товар обновлён")
            else:
                # Добавление
                product_id = self.db.add_product((
                    barcode, name, description, price, cost_price, category, unit, quantity, min_quantity
                ))
                
                # Синхронизация с МойСклад если включена
                self.sync_to_moysklad({
                    'id': product_id,
                    'name': name,
                    'description': description,
                    'price': price,
                    'barcode': barcode
                })
                
                messagebox.showinfo("Успех", "Товар добавлен")
                
            self.result = True
            self.dialog.destroy()
            
        except Exception as e:
            messagebox.showerror("Ошибка", f"Ошибка сохранения: {str(e)}")
            
    def sync_to_moysklad(self, product_data):
        """Синхронизация товара с МойСклад"""
        try:
            if self.db.get_setting('moysklad_sync') == '1':
                token = self.db.get_setting('moysklad_token')
                if token:
                    api = MoySkladAPI(token)
                    success = api.sync_product_to_moysklad(product_data)
                    if success:
                        print(f"Товар {product_data['name']} синхронизирован с МойСклад")
                    else:
                        print(f"Ошибка синхронизации товара {product_data['name']} с МойСклад")
        except Exception as e:
            print(f"Ошибка синхронизации с МойСклад: {e}")