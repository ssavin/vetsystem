#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VetSystem Fiscal Printer Client
Локальная программа для печати фискальных чеков через кассовые аппараты
Поддерживает: Атол (DTO v10), Штрих-М/Вики Принт

Автор: VetSystem Team
Версия: 1.0.0
"""

import sys
import os
import json
import time
import threading
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from datetime import datetime
import requests
import configparser
from pathlib import Path

# Попытка импорта Windows-специфичных библиотек
try:
    import win32com.client
    import pythoncom
    WIN32_AVAILABLE = True
except ImportError:
    WIN32_AVAILABLE = False
    print("Предупреждение: win32com не найден. Функции печати будут недоступны.")

class FiscalPrinterConfig:
    """Конфигурация для работы с фискальными принтерами"""
    
    def __init__(self):
        self.config_file = Path("fiscal_config.ini")
        self.config = configparser.ConfigParser()
        self.load_config()
    
    def load_config(self):
        """Загрузка конфигурации из файла"""
        if self.config_file.exists():
            self.config.read(self.config_file, encoding='utf-8')
        else:
            self.create_default_config()
    
    def create_default_config(self):
        """Создание конфигурации по умолчанию"""
        self.config['VETSYSTEM'] = {
            'api_url': 'http://localhost:5000',
            'auth_token': '',
            'check_interval': '30'
        }
        
        self.config['ATOL'] = {
            'enabled': 'true',
            'device_name': 'ATOL',
            'com_port': 'COM1',
            'baud_rate': '115200',
            'timeout': '5000'
        }
        
        self.config['SHTRIH'] = {
            'enabled': 'false', 
            'device_name': 'SHTRIH-FR-K',
            'com_port': 'COM2',
            'baud_rate': '115200',
            'timeout': '5000'
        }
        
        self.config['FISCAL'] = {
            'tax_system': '2',  # УСН доходы
            'cashier_name': 'Кассир',
            'auto_cut': 'true',
            'bell': 'false'
        }
        
        self.save_config()
    
    def save_config(self):
        """Сохранение конфигурации в файл"""
        with open(self.config_file, 'w', encoding='utf-8') as f:
            self.config.write(f)
    
    def get(self, section, key, fallback=None):
        """Получение значения из конфигурации"""
        return self.config.get(section, key, fallback=fallback)
    
    def set(self, section, key, value):
        """Установка значения в конфигурацию"""
        if section not in self.config:
            self.config[section] = {}
        self.config[section][key] = str(value)


class AtolPrinter:
    """Класс для работы с кассовыми аппаратами Атол"""
    
    def __init__(self, config):
        self.config = config
        self.driver = None
        self.connected = False
        
    def connect(self):
        """Подключение к кассовому аппарату Атол"""
        if not WIN32_AVAILABLE:
            raise Exception("win32com недоступен. Установите pywin32.")
            
        try:
            # Инициализация COM
            pythoncom.CoInitialize()
            
            # Создание объекта драйвера Атол
            self.driver = win32com.client.Dispatch("AddIn.DrvFR")
            
            # Настройка параметров подключения
            self.driver.ConnectionType = 0  # COM-порт
            self.driver.ComNumber = int(self.config.get('ATOL', 'com_port', 'COM1').replace('COM', ''))
            self.driver.BaudRate = int(self.config.get('ATOL', 'baud_rate', '115200'))
            self.driver.Timeout = int(self.config.get('ATOL', 'timeout', '5000'))
            
            # Подключение
            self.driver.Connect()
            if self.driver.ResultCode != 0:
                raise Exception(f"Ошибка подключения: {self.driver.ResultCodeDescription}")
            
            self.connected = True
            return True
            
        except Exception as e:
            self.connected = False
            raise Exception(f"Не удалось подключиться к Атол: {str(e)}")
    
    def disconnect(self):
        """Отключение от кассового аппарата"""
        if self.driver and self.connected:
            try:
                self.driver.Disconnect()
            except:
                pass
            finally:
                self.connected = False
                pythoncom.CoUninitialize()
    
    def print_receipt(self, receipt_data):
        """Печать фискального чека"""
        if not self.connected:
            raise Exception("Принтер не подключен")
        
        try:
            # Открытие документа
            self.driver.OpenReceipt()
            if self.driver.ResultCode != 0:
                raise Exception(f"Ошибка открытия чека: {self.driver.ResultCodeDescription}")
            
            # Добавление позиций
            for item in receipt_data.get('items', []):
                self.driver.Name = item['name'][:60]  # Ограничение длины
                self.driver.Quantity = float(item['quantity'])
                self.driver.Price = float(item['price'])
                self.driver.Department = 1
                
                # Определение НДС
                vat_rate = item.get('vatRate', '20')
                if vat_rate == 'not_applicable':
                    self.driver.Tax1 = 0  # Без НДС
                elif vat_rate == '0':
                    self.driver.Tax1 = 1  # НДС 0%
                elif vat_rate == '10':
                    self.driver.Tax1 = 2  # НДС 10%
                elif vat_rate == '20':
                    self.driver.Tax1 = 3  # НДС 20%
                else:
                    self.driver.Tax1 = 0  # По умолчанию без НДС
                
                # Регистрация позиции
                self.driver.Registration()
                if self.driver.ResultCode != 0:
                    raise Exception(f"Ошибка регистрации позиции: {self.driver.ResultCodeDescription}")
            
            # Закрытие документа (наличными)
            cash_sum = float(receipt_data.get('total', 0))
            self.driver.Summ1 = cash_sum
            self.driver.CloseReceipt()
            
            if self.driver.ResultCode != 0:
                raise Exception(f"Ошибка закрытия чека: {self.driver.ResultCodeDescription}")
            
            return {
                'success': True,
                'fiscal_number': self.driver.DocumentNumber,
                'shift_number': self.driver.ECRMode8Status,
                'receipt_number': self.driver.ReceiptNumber,
                'fiscal_sign': getattr(self.driver, 'FiscalSign', 'N/A')
            }
            
        except Exception as e:
            # Отмена документа в случае ошибки
            try:
                self.driver.CancelReceipt()
            except:
                pass
            raise e


class ShtrihPrinter:
    """Класс для работы с кассовыми аппаратами Штрих-М/Вики Принт"""
    
    def __init__(self, config):
        self.config = config
        self.driver = None
        self.connected = False
    
    def connect(self):
        """Подключение к кассовому аппарату Штрих-М"""
        if not WIN32_AVAILABLE:
            raise Exception("win32com недоступен. Установите pywin32.")
            
        try:
            pythoncom.CoInitialize()
            
            # Создание объекта драйвера Штрих
            self.driver = win32com.client.Dispatch("AddIn.DrvFR")
            
            # Настройка параметров
            self.driver.ConnectionType = 0  # COM-порт
            self.driver.ComNumber = int(self.config.get('SHTRIH', 'com_port', 'COM2').replace('COM', ''))
            self.driver.BaudRate = int(self.config.get('SHTRIH', 'baud_rate', '115200'))
            self.driver.Timeout = int(self.config.get('SHTRIH', 'timeout', '5000'))
            
            # Подключение
            self.driver.Connect()
            if self.driver.ResultCode != 0:
                raise Exception(f"Ошибка подключения: {self.driver.ResultCodeDescription}")
            
            self.connected = True
            return True
            
        except Exception as e:
            self.connected = False
            raise Exception(f"Не удалось подключиться к Штрих-М: {str(e)}")
    
    def disconnect(self):
        """Отключение от кассового аппарата"""
        if self.driver and self.connected:
            try:
                self.driver.Disconnect()
            except:
                pass
            finally:
                self.connected = False
                pythoncom.CoUninitialize()
    
    def print_receipt(self, receipt_data):
        """Печать фискального чека (аналогично Атол)"""
        if not self.connected:
            raise Exception("Принтер не подключен")
        
        # Реализация аналогична AtolPrinter.print_receipt()
        # с учетом специфики драйвера Штрих-М
        return self._print_receipt_shtrih(receipt_data)
    
    def _print_receipt_shtrih(self, receipt_data):
        """Внутренний метод печати для Штрих-М"""
        try:
            # Открытие документа
            self.driver.OpenDocument()
            if self.driver.ResultCode != 0:
                raise Exception(f"Ошибка открытия документа: {self.driver.ResultCodeDescription}")
            
            # Позиции аналогично Атол, но с учетом особенностей API Штрих
            for item in receipt_data.get('items', []):
                self.driver.StringForPrinting = item['name'][:48]  # Штрих имеет другое ограничение
                self.driver.Quantity = float(item['quantity'])
                self.driver.Price = float(item['price'])
                
                # НДС для Штрих
                vat_rate = item.get('vatRate', '20')
                if vat_rate == 'not_applicable':
                    self.driver.TaxTypeNumber = 0
                elif vat_rate == '10':
                    self.driver.TaxTypeNumber = 2
                elif vat_rate == '20':
                    self.driver.TaxTypeNumber = 1
                else:
                    self.driver.TaxTypeNumber = 0
                
                self.driver.Sale()
                if self.driver.ResultCode != 0:
                    raise Exception(f"Ошибка продажи: {self.driver.ResultCodeDescription}")
            
            # Закрытие документа
            cash_sum = float(receipt_data.get('total', 0))
            self.driver.Summ1 = cash_sum
            self.driver.CloseDocument()
            
            if self.driver.ResultCode != 0:
                raise Exception(f"Ошибка закрытия документа: {self.driver.ResultCodeDescription}")
            
            return {
                'success': True,
                'fiscal_number': getattr(self.driver, 'DocumentNumber', 'N/A'),
                'shift_number': getattr(self.driver, 'ShiftNumber', 'N/A'),
                'receipt_number': getattr(self.driver, 'ReceiptNumber', 'N/A'),
                'fiscal_sign': getattr(self.driver, 'FiscalSign', 'N/A')
            }
            
        except Exception as e:
            try:
                self.driver.CancelDocument()
            except:
                pass
            raise e


class VetSystemApiClient:
    """Клиент для работы с API VetSystem"""
    
    def __init__(self, config):
        self.config = config
        self.base_url = config.get('VETSYSTEM', 'api_url', 'http://localhost:5000')
        self.auth_token = config.get('VETSYSTEM', 'auth_token', '')
        self.session = requests.Session()
        
        if self.auth_token:
            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
    
    def test_connection(self):
        """Тестирование подключения к VetSystem"""
        try:
            response = self.session.get(f"{self.base_url}/api/auth/me", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def get_pending_receipts(self):
        """Получение очереди чеков для печати"""
        try:
            response = self.session.get(f"{self.base_url}/api/fiscal/pending-receipts", timeout=10)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"Ошибка получения чеков: {e}")
            return []
    
    def mark_receipt_printed(self, receipt_id, print_result):
        """Отметка чека как напечатанного"""
        try:
            data = {
                'receipt_id': receipt_id,
                'print_result': print_result,
                'printed_at': datetime.now().isoformat()
            }
            response = self.session.post(f"{self.base_url}/api/fiscal/mark-printed", json=data, timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"Ошибка отметки чека: {e}")
            return False


class FiscalPrinterGUI:
    """Главное окно приложения"""
    
    def __init__(self):
        self.config = FiscalPrinterConfig()
        self.api_client = VetSystemApiClient(self.config)
        self.current_printer = None
        self.running = False
        
        self.setup_gui()
        self.setup_printers()
        
    def setup_gui(self):
        """Настройка графического интерфейса"""
        self.root = tk.Tk()
        self.root.title("VetSystem - Фискальный принтер")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        
        # Создание вкладок
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Вкладка "Состояние"
        self.status_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.status_frame, text="Состояние")
        self.setup_status_tab()
        
        # Вкладка "Настройки"
        self.settings_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.settings_frame, text="Настройки")
        self.setup_settings_tab()
        
        # Вкладка "Лог"
        self.log_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.log_frame, text="Лог")
        self.setup_log_tab()
        
        # Статус бар
        self.status_bar = ttk.Label(self.root, text="Готов к работе", relief=tk.SUNKEN)
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
        
    def setup_status_tab(self):
        """Настройка вкладки состояния"""
        # Статус подключений
        conn_frame = ttk.LabelFrame(self.status_frame, text="Подключения")
        conn_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # VetSystem
        self.vetsystem_status = ttk.Label(conn_frame, text="VetSystem: Не подключен", foreground="red")
        self.vetsystem_status.pack(anchor=tk.W, padx=5, pady=2)
        
        # Принтер
        self.printer_status = ttk.Label(conn_frame, text="Принтер: Не подключен", foreground="red")
        self.printer_status.pack(anchor=tk.W, padx=5, pady=2)
        
        # Кнопки управления
        btn_frame = ttk.Frame(self.status_frame)
        btn_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.start_btn = ttk.Button(btn_frame, text="Запустить службу", command=self.start_service)
        self.start_btn.pack(side=tk.LEFT, padx=5)
        
        self.stop_btn = ttk.Button(btn_frame, text="Остановить службу", command=self.stop_service, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=5)
        
        self.test_btn = ttk.Button(btn_frame, text="Тестовый чек", command=self.print_test_receipt)
        self.test_btn.pack(side=tk.LEFT, padx=5)
        
        # Статистика
        stats_frame = ttk.LabelFrame(self.status_frame, text="Статистика")
        stats_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.stats_text = scrolledtext.ScrolledText(stats_frame, height=10)
        self.stats_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
    def setup_settings_tab(self):
        """Настройка вкладки настроек"""
        # VetSystem настройки
        vetsystem_frame = ttk.LabelFrame(self.settings_frame, text="VetSystem")
        vetsystem_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(vetsystem_frame, text="URL API:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=2)
        self.api_url_var = tk.StringVar(value=self.config.get('VETSYSTEM', 'api_url'))
        ttk.Entry(vetsystem_frame, textvariable=self.api_url_var, width=50).grid(row=0, column=1, padx=5, pady=2)
        
        # Принтер настройки
        printer_frame = ttk.LabelFrame(self.settings_frame, text="Принтер")
        printer_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(printer_frame, text="Тип принтера:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=2)
        self.printer_type_var = tk.StringVar(value="ATOL")
        printer_combo = ttk.Combobox(printer_frame, textvariable=self.printer_type_var, values=["ATOL", "SHTRIH"])
        printer_combo.grid(row=0, column=1, padx=5, pady=2)
        
        ttk.Label(printer_frame, text="COM-порт:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=2)
        self.com_port_var = tk.StringVar(value=self.config.get('ATOL', 'com_port'))
        ttk.Entry(printer_frame, textvariable=self.com_port_var, width=10).grid(row=1, column=1, sticky=tk.W, padx=5, pady=2)
        
        # Кнопка сохранения
        save_btn = ttk.Button(self.settings_frame, text="Сохранить настройки", command=self.save_settings)
        save_btn.pack(pady=10)
        
    def setup_log_tab(self):
        """Настройка вкладки лога"""
        self.log_text = scrolledtext.ScrolledText(self.log_frame)
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Кнопки управления логом
        log_btn_frame = ttk.Frame(self.log_frame)
        log_btn_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(log_btn_frame, text="Очистить лог", command=self.clear_log).pack(side=tk.LEFT, padx=5)
        ttk.Button(log_btn_frame, text="Сохранить лог", command=self.save_log).pack(side=tk.LEFT, padx=5)
        
    def setup_printers(self):
        """Настройка принтеров"""
        self.atol_printer = AtolPrinter(self.config)
        self.shtrih_printer = ShtrihPrinter(self.config)
        
    def log_message(self, message):
        """Добавление сообщения в лог"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)
        print(message)  # Дублирование в консоль
        
    def update_status(self):
        """Обновление статуса подключений"""
        # Проверка VetSystem
        if self.api_client.test_connection():
            self.vetsystem_status.config(text="VetSystem: Подключен", foreground="green")
        else:
            self.vetsystem_status.config(text="VetSystem: Не подключен", foreground="red")
        
        # Проверка принтера
        if self.current_printer and self.current_printer.connected:
            self.printer_status.config(text=f"Принтер: Подключен ({self.printer_type_var.get()})", foreground="green")
        else:
            self.printer_status.config(text="Принтер: Не подключен", foreground="red")
    
    def start_service(self):
        """Запуск службы печати"""
        try:
            # Подключение к принтеру
            printer_type = self.printer_type_var.get()
            if printer_type == "ATOL":
                self.current_printer = self.atol_printer
            else:
                self.current_printer = self.shtrih_printer
            
            self.current_printer.connect()
            self.log_message(f"Подключен к принтеру {printer_type}")
            
            # Запуск мониторинга
            self.running = True
            self.monitor_thread = threading.Thread(target=self.monitor_receipts, daemon=True)
            self.monitor_thread.start()
            
            self.start_btn.config(state=tk.DISABLED)
            self.stop_btn.config(state=tk.NORMAL)
            self.status_bar.config(text="Служба запущена")
            self.log_message("Служба печати запущена")
            
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось запустить службу: {str(e)}")
            self.log_message(f"Ошибка запуска: {str(e)}")
    
    def stop_service(self):
        """Остановка службы печати"""
        self.running = False
        
        if self.current_printer:
            self.current_printer.disconnect()
            self.log_message("Принтер отключен")
        
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)
        self.status_bar.config(text="Служба остановлена")
        self.log_message("Служба печати остановлена")
    
    def monitor_receipts(self):
        """Мониторинг очереди чеков для печати"""
        while self.running:
            try:
                pending_receipts = self.api_client.get_pending_receipts()
                
                for receipt in pending_receipts:
                    if not self.running:
                        break
                    
                    self.log_message(f"Печать чека #{receipt.get('id', 'N/A')}")
                    
                    try:
                        # Печать чека
                        print_result = self.current_printer.print_receipt(receipt)
                        
                        # Отметка как напечатанного
                        self.api_client.mark_receipt_printed(receipt['id'], print_result)
                        
                        self.log_message(f"Чек #{receipt['id']} напечатан успешно")
                        
                    except Exception as e:
                        error_result = {'success': False, 'error': str(e)}
                        self.api_client.mark_receipt_printed(receipt['id'], error_result)
                        self.log_message(f"Ошибка печати чека #{receipt['id']}: {str(e)}")
                
                # Обновление статуса
                self.root.after(0, self.update_status)
                
            except Exception as e:
                self.log_message(f"Ошибка мониторинга: {str(e)}")
            
            # Пауза между проверками
            time.sleep(int(self.config.get('VETSYSTEM', 'check_interval', '30')))
    
    def print_test_receipt(self):
        """Печать тестового чека"""
        if not self.current_printer or not self.current_printer.connected:
            messagebox.showerror("Ошибка", "Принтер не подключен")
            return
        
        test_receipt = {
            'id': 'TEST_' + str(int(time.time())),
            'items': [
                {
                    'name': 'Тестовая позиция',
                    'quantity': 1,
                    'price': 100.00,
                    'vatRate': '20'
                }
            ],
            'total': 100.00,
            'customer': {
                'name': 'Тестовый покупатель'
            }
        }
        
        try:
            result = self.current_printer.print_receipt(test_receipt)
            self.log_message(f"Тестовый чек напечатан: {result}")
            messagebox.showinfo("Успех", "Тестовый чек напечатан успешно")
        except Exception as e:
            self.log_message(f"Ошибка печати тестового чека: {str(e)}")
            messagebox.showerror("Ошибка", f"Ошибка печати: {str(e)}")
    
    def save_settings(self):
        """Сохранение настроек"""
        self.config.set('VETSYSTEM', 'api_url', self.api_url_var.get())
        self.config.set('ATOL', 'com_port', self.com_port_var.get())
        self.config.save_config()
        
        # Обновление API клиента
        self.api_client = VetSystemApiClient(self.config)
        
        messagebox.showinfo("Настройки", "Настройки сохранены")
        self.log_message("Настройки сохранены")
    
    def clear_log(self):
        """Очистка лога"""
        self.log_text.delete(1.0, tk.END)
    
    def save_log(self):
        """Сохранение лога в файл"""
        from tkinter import filedialog
        filename = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")]
        )
        if filename:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(self.log_text.get(1.0, tk.END))
            messagebox.showinfo("Лог", f"Лог сохранен в {filename}")
    
    def run(self):
        """Запуск главного цикла приложения"""
        self.update_status()
        self.log_message("VetSystem Fiscal Printer запущен")
        
        # Обработка закрытия окна
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        self.root.mainloop()
    
    def on_closing(self):
        """Обработка закрытия приложения"""
        if self.running:
            self.stop_service()
        self.root.destroy()


def main():
    """Главная функция"""
    print("VetSystem Fiscal Printer v1.0.0")
    print("Поддержка: Атол (DTO v10), Штрих-М/Вики Принт")
    print("-" * 50)
    
    # Проверка Windows
    if sys.platform != 'win32':
        print("Внимание: Программа предназначена для Windows")
    
    # Проверка win32com
    if not WIN32_AVAILABLE:
        print("Предупреждение: pywin32 не установлен")
        print("Установите: pip install pywin32")
    
    # Запуск приложения
    try:
        app = FiscalPrinterGUI()
        app.run()
    except KeyboardInterrupt:
        print("\nПрограмма прервана пользователем")
    except Exception as e:
        print(f"Критическая ошибка: {e}")
        input("Нажмите Enter для выхода...")


if __name__ == "__main__":
    main()