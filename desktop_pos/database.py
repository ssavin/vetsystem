"""
Модуль для работы с базой данных SQLite
Создание таблиц и основные операции
"""

import sqlite3
import os
from datetime import datetime
import json
import bcrypt
import uuid


class DatabaseManager:
    def __init__(self, db_path="vetpos.db"):
        self.db_path = db_path
        self.connection = None
        self.create_database()
        
    def create_database(self):
        """Создание базы данных и таблиц"""
        self.connection = sqlite3.connect(self.db_path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row  # Для доступа к колонкам по имени
        
        cursor = self.connection.cursor()
        
        # Таблица пользователей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT DEFAULT 'cashier',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        ''')
        
        # Таблица товаров
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                barcode TEXT UNIQUE,
                name TEXT NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                cost_price DECIMAL(10,2),
                category TEXT,
                unit TEXT DEFAULT 'шт',
                quantity DECIMAL(10,3) DEFAULT 0,
                min_quantity DECIMAL(10,3) DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Таблица клиентов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                address TEXT,
                discount_percent DECIMAL(5,2) DEFAULT 0,
                bonus_points INTEGER DEFAULT 0,
                total_purchases DECIMAL(12,2) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        ''')
        
        # Таблица смен
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS shifts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cashier_id INTEGER NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME,
                start_amount DECIMAL(10,2) NOT NULL,
                end_amount DECIMAL(10,2),
                total_sales DECIMAL(10,2) DEFAULT 0,
                total_returns DECIMAL(10,2) DEFAULT 0,
                transactions_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'open',
                FOREIGN KEY (cashier_id) REFERENCES users (id)
            )
        ''')
        
        # Таблица продаж
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shift_id INTEGER NOT NULL,
                customer_id INTEGER,
                total_amount DECIMAL(10,2) NOT NULL,
                discount_amount DECIMAL(10,2) DEFAULT 0,
                tax_amount DECIMAL(10,2) DEFAULT 0,
                final_amount DECIMAL(10,2) NOT NULL,
                payment_method TEXT NOT NULL,
                status TEXT DEFAULT 'completed',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                receipt_number TEXT,
                FOREIGN KEY (shift_id) REFERENCES shifts (id),
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        ''')
        
        # Таблица позиций продаж
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity DECIMAL(10,3) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                discount_percent DECIMAL(5,2) DEFAULT 0,
                total_amount DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (sale_id) REFERENCES sales (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
        ''')
        
        # Таблица движения товаров
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS inventory_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                movement_type TEXT NOT NULL, -- 'in', 'out', 'adjustment'
                quantity DECIMAL(10,3) NOT NULL,
                price DECIMAL(10,2),
                reason TEXT,
                document_number TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_id INTEGER,
                FOREIGN KEY (product_id) REFERENCES products (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Таблица настроек
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Создание индексов
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)')
        
        # Создание пользователя по умолчанию с хешированным паролем
        admin_password_hash = bcrypt.hashpw('admin'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute('''
            INSERT OR IGNORE INTO users (username, password, name, role) 
            VALUES ('admin', ?, 'Администратор', 'admin')
        ''', (admin_password_hash,))
        
        # Настройки по умолчанию
        default_settings = [
            ('company_name', 'Ветеринарная клиника', 'Название организации'),
            ('company_address', '', 'Адрес организации'),
            ('company_inn', '', 'ИНН организации'),
            ('printer_name', '', 'Название принтера для чеков'),
            ('fiscal_printer', '0', 'Использовать фискальный принтер'),
            ('tax_rate', '20', 'Ставка НДС в процентах'),
            ('currency', 'RUB', 'Валюта'),
            ('moysklad_token', '', 'Токен API МойСклад'),
            ('moysklad_sync', '0', 'Синхронизация с МойСклад')
        ]
        
        for key, value, description in default_settings:
            cursor.execute('''
                INSERT OR IGNORE INTO settings (key, value, description) 
                VALUES (?, ?, ?)
            ''', (key, value, description))
        
        # Добавление тестовых товаров
        test_products = [
            ('8901234567890', 'Корм для собак Premium', 'Сухой корм для взрослых собак', 1500.00, 1200.00, 'Корма', 'шт', 10),
            ('8901234567891', 'Витамины для кошек', 'Комплекс витаминов и минералов', 850.00, 650.00, 'Витамины', 'шт', 25),
            ('8901234567892', 'Ошейник от блох', 'Защитный ошейник для собак', 450.00, 350.00, 'Аксессуары', 'шт', 15),
            ('8901234567893', 'Шампунь лечебный', 'Шампунь для лечения кожных заболеваний', 750.00, 550.00, 'Уход', 'шт', 8),
            ('8901234567894', 'Игрушка для котят', 'Интерактивная игрушка-мышка', 300.00, 200.00, 'Игрушки', 'шт', 20)
        ]
        
        for barcode, name, description, price, cost_price, category, unit, quantity in test_products:
            cursor.execute('''
                INSERT OR IGNORE INTO products 
                (barcode, name, description, price, cost_price, category, unit, quantity) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (barcode, name, description, price, cost_price, category, unit, quantity))
        
        # Добавление тестовых клиентов
        test_customers = [
            ('Иванов Иван Иванович', '+7-915-123-45-67', 'ivanov@email.com', 'г. Москва, ул. Центральная, д. 1', 5),
            ('Петрова Анна Сергеевна', '+7-916-234-56-78', 'petrova@email.com', 'г. Москва, ул. Садовая, д. 15', 10),
            ('Сидоров Петр Николаевич', '+7-917-345-67-89', '', 'г. Москва, ул. Лесная, д. 8', 0)
        ]
        
        for name, phone, email, address, discount in test_customers:
            cursor.execute('''
                INSERT OR IGNORE INTO customers 
                (name, phone, email, address, discount_percent) 
                VALUES (?, ?, ?, ?, ?)
            ''', (name, phone, email, address, discount))
        
        self.connection.commit()
        
    def get_connection(self):
        """Получение соединения с БД"""
        return self.connection
        
    def execute_query(self, query, params=None):
        """Выполнение запроса"""
        cursor = self.connection.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        return cursor
        
    def fetch_all(self, query, params=None):
        """Получение всех записей"""
        cursor = self.execute_query(query, params)
        return cursor.fetchall()
        
    def fetch_one(self, query, params=None):
        """Получение одной записи"""
        cursor = self.execute_query(query, params)
        return cursor.fetchone()
        
    def commit(self):
        """Сохранение изменений"""
        self.connection.commit()
        
    # Методы для работы с товарами
    def get_all_products(self):
        """Получение всех товаров"""
        return self.fetch_all('''
            SELECT * FROM products 
            WHERE is_active = 1 
            ORDER BY name
        ''')
        
    def search_products(self, search_term):
        """Поиск товаров"""
        return self.fetch_all('''
            SELECT * FROM products 
            WHERE is_active = 1 
            AND (name LIKE ? OR barcode LIKE ? OR description LIKE ?)
            ORDER BY name
        ''', (f'%{search_term}%', f'%{search_term}%', f'%{search_term}%'))
        
    def get_product_by_barcode(self, barcode):
        """Получение товара по штрихкоду"""
        return self.fetch_one('''
            SELECT * FROM products 
            WHERE barcode = ? AND is_active = 1
        ''', (barcode,))
        
    def add_product(self, product_data):
        """Добавление товара"""
        cursor = self.execute_query('''
            INSERT INTO products 
            (barcode, name, description, price, cost_price, category, unit, quantity, min_quantity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', product_data)
        self.commit()
        return cursor.lastrowid
        
    def update_product(self, product_id, product_data):
        """Обновление товара"""
        self.execute_query('''
            UPDATE products 
            SET name=?, description=?, price=?, cost_price=?, category=?, 
                unit=?, quantity=?, min_quantity=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        ''', (*product_data, product_id))
        self.commit()
        
    # Методы для работы с клиентами
    def get_all_customers(self):
        """Получение всех клиентов"""
        return self.fetch_all('''
            SELECT * FROM customers 
            WHERE is_active = 1 
            ORDER BY name
        ''')
        
    def search_customers(self, search_term):
        """Поиск клиентов"""
        return self.fetch_all('''
            SELECT * FROM customers 
            WHERE is_active = 1 
            AND (name LIKE ? OR phone LIKE ?)
            ORDER BY name
        ''', (f'%{search_term}%', f'%{search_term}%'))
        
    def add_customer(self, customer_data):
        """Добавление клиента"""
        cursor = self.execute_query('''
            INSERT INTO customers (name, phone, email, address, discount_percent)
            VALUES (?, ?, ?, ?, ?)
        ''', customer_data)
        self.commit()
        return cursor.lastrowid
        
    # Методы для работы со сменами
    def open_shift(self, cashier_username, start_amount):
        """Открытие смены"""
        # Получение ID кассира
        user = self.fetch_one('SELECT id FROM users WHERE username = ?', (cashier_username,))
        if not user:
            raise ValueError("Пользователь не найден")
            
        cursor = self.execute_query('''
            INSERT INTO shifts (cashier_id, start_time, start_amount)
            VALUES (?, CURRENT_TIMESTAMP, ?)
        ''', (user['id'], start_amount))
        self.commit()
        return cursor.lastrowid
        
    def get_current_shift(self, cashier_username):
        """Получение текущей смены"""
        return self.fetch_one('''
            SELECT s.*, u.username, u.name 
            FROM shifts s
            JOIN users u ON s.cashier_id = u.id
            WHERE u.username = ? AND s.status = 'open'
            ORDER BY s.start_time DESC
            LIMIT 1
        ''', (cashier_username,))
        
    # Методы для продаж
    def create_sale(self, shift_id, customer_id, items, payment_method, discount_amount=0):
        """Создание продажи"""
        # Расчёт сумм
        subtotal = sum(item['quantity'] * item['price'] for item in items)
        total_amount = subtotal - discount_amount
        
        # Создание записи продажи
        cursor = self.execute_query('''
            INSERT INTO sales 
            (shift_id, customer_id, total_amount, discount_amount, final_amount, payment_method)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (shift_id, customer_id, subtotal, discount_amount, total_amount, payment_method))
        
        sale_id = cursor.lastrowid
        
        # Добавление позиций
        for item in items:
            self.execute_query('''
                INSERT INTO sale_items 
                (sale_id, product_id, quantity, price, total_amount)
                VALUES (?, ?, ?, ?, ?)
            ''', (sale_id, item['product_id'], item['quantity'], 
                  item['price'], item['quantity'] * item['price']))
            
            # Обновление остатков
            self.execute_query('''
                UPDATE products 
                SET quantity = quantity - ?
                WHERE id = ?
            ''', (item['quantity'], item['product_id']))
        
        self.commit()
        return sale_id
        
    def get_sales_report(self, date_from=None, date_to=None):
        """Отчёт по продажам"""
        query = '''
            SELECT s.*, c.name as customer_name, u.name as cashier_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            JOIN shifts sh ON s.shift_id = sh.id
            JOIN users u ON sh.cashier_id = u.id
        '''
        params = []
        
        if date_from and date_to:
            query += ' WHERE DATE(s.created_at) BETWEEN ? AND ?'
            params = [date_from, date_to]
            
        query += ' ORDER BY s.created_at DESC'
        
        return self.fetch_all(query, params)
        
    # Методы для настроек
    def get_setting(self, key):
        """Получение настройки"""
        result = self.fetch_one('SELECT value FROM settings WHERE key = ?', (key,))
        return result['value'] if result else None
        
    def set_setting(self, key, value):
        """Установка настройки"""
        self.execute_query('''
            INSERT OR REPLACE INTO settings (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        ''', (key, value))
        self.commit()
        
    # Методы для работы с пользователями и паролями
    def verify_password(self, username, password):
        """Проверка пароля пользователя"""
        user = self.fetch_one('SELECT password FROM users WHERE username = ? AND is_active = 1', (username,))
        if user:
            return bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8'))
        return False
        
    def change_password(self, username, new_password):
        """Изменение пароля пользователя"""
        password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        self.execute_query('UPDATE users SET password = ? WHERE username = ?', (password_hash, username))
        self.commit()
        
    def get_user_by_username(self, username):
        """Получение пользователя по имени"""
        return self.fetch_one('SELECT * FROM users WHERE username = ? AND is_active = 1', (username,))
        
    def close(self):
        """Закрытие соединения с БД"""
        if self.connection:
            self.connection.close()