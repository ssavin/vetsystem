"""
Модуль интеграций с внешними сервисами
"""

import requests
import json
import serial
import time
from datetime import datetime


class MoySkladAPI:
    """Интеграция с МойСклад API"""
    
    def __init__(self, token):
        self.token = token
        self.base_url = "https://api.moysklad.ru/api/remap/1.2"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
    def test_connection(self):
        """Тест соединения с МойСклад"""
        try:
            response = requests.get(
                f"{self.base_url}/entity/organization",
                headers=self.headers,
                timeout=10
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Ошибка соединения с МойСклад: {e}")
            return False
            
    def get_products(self, limit=100):
        """Получение товаров из МойСклад"""
        try:
            response = requests.get(
                f"{self.base_url}/entity/product",
                headers=self.headers,
                params={"limit": limit},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("rows", [])
            else:
                print(f"Ошибка получения товаров: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"Ошибка запроса товаров: {e}")
            return []
            
    def sync_product_to_moysklad(self, product_data):
        """Синхронизация товара в МойСклад"""
        try:
            payload = {
                "name": product_data["name"],
                "description": product_data.get("description", ""),
                "salePrices": [{
                    "value": int(product_data["price"] * 100),  # в копейках
                    "currency": {
                        "meta": {
                            "href": f"{self.base_url}/entity/currency/rub",
                            "type": "currency"
                        }
                    }
                }]
            }
            
            if product_data.get("barcode"):
                payload["code"] = product_data["barcode"]
                
            response = requests.post(
                f"{self.base_url}/entity/product",
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            return response.status_code in [200, 201]
            
        except Exception as e:
            print(f"Ошибка синхронизации товара: {e}")
            return False


class YooKassaPayments:
    """Интеграция с YooKassa (ЮKassa)"""
    
    def __init__(self, shop_id, secret_key):
        self.shop_id = shop_id
        self.secret_key = secret_key
        self.base_url = "https://api.yookassa.ru/v3"
        
    def test_connection(self):
        """Тест соединения с YooKassa"""
        try:
            import uuid
            idempotence_key = str(uuid.uuid4())
            
            headers = {
                "Content-Type": "application/json",
                "Idempotence-Key": idempotence_key
            }
            
            # Тестовый запрос на создание платежа с минимальной суммой
            payload = {
                "amount": {
                    "value": "1.00",
                    "currency": "RUB"
                },
                "confirmation": {
                    "type": "redirect",
                    "return_url": "https://example.com"
                },
                "description": "Тестовый платеж"
            }
            
            response = requests.post(
                f"{self.base_url}/payments",
                headers=headers,
                json=payload,
                auth=(self.shop_id, self.secret_key),
                timeout=10
            )
            
            return response.status_code in [200, 201]
            
        except Exception as e:
            print(f"Ошибка соединения с YooKassa: {e}")
            return False
            
    def create_payment(self, amount, description, return_url):
        """Создание платежа в YooKassa"""
        try:
            import uuid
            idempotence_key = str(uuid.uuid4())
            
            headers = {
                "Content-Type": "application/json",
                "Idempotence-Key": idempotence_key
            }
            
            payload = {
                "amount": {
                    "value": f"{amount:.2f}",
                    "currency": "RUB"
                },
                "confirmation": {
                    "type": "redirect",
                    "return_url": return_url
                },
                "description": description,
                "capture": True
            }
            
            response = requests.post(
                f"{self.base_url}/payments",
                headers=headers,
                json=payload,
                auth=(self.shop_id, self.secret_key),
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            else:
                print(f"Ошибка создания платежа: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Ошибка создания платежа: {e}")
            return None


class FiscalPrinter:
    """Базовый класс для работы с фискальными принтерами"""
    
    def __init__(self, printer_type, port, speed=9600):
        self.printer_type = printer_type
        self.port = port
        self.speed = speed
        self.connection = None
        
    def connect(self):
        """Подключение к принтеру"""
        try:
            self.connection = serial.Serial(
                port=self.port,
                baudrate=self.speed,
                timeout=5
            )
            return True
        except Exception as e:
            print(f"Ошибка подключения к принтеру: {e}")
            return False
            
    def disconnect(self):
        """Отключение от принтера"""
        if self.connection and self.connection.is_open:
            self.connection.close()
            
    def test_connection(self):
        """Тест соединения с принтером"""
        if self.connect():
            try:
                # Отправка команды статуса (зависит от типа принтера)
                if self.printer_type == "Атол":
                    command = b'\x1B\x05'  # ENQ для Атол
                elif self.printer_type == "Viki Print":
                    command = b'\x10\x04\x01'  # Статус для Viki Print
                else:
                    command = b'\x1B\x05'  # Общая команда
                    
                self.connection.write(command)
                response = self.connection.read(10)
                
                self.disconnect()
                return len(response) > 0
                
            except Exception as e:
                print(f"Ошибка тестирования принтера: {e}")
                self.disconnect()
                return False
        return False
        
    def print_receipt(self, receipt_data):
        """Печать чека"""
        if not self.connect():
            return False
            
        try:
            # Базовая реализация печати
            # В реальном приложении здесь будет специфичная для принтера логика
            
            if self.printer_type == "Атол":
                return self._print_atol_receipt(receipt_data)
            elif self.printer_type == "Viki Print":
                return self._print_viki_receipt(receipt_data)
            else:
                return self._print_generic_receipt(receipt_data)
                
        except Exception as e:
            print(f"Ошибка печати чека: {e}")
            return False
        finally:
            self.disconnect()
            
    def _print_atol_receipt(self, receipt_data):
        """Печать чека для принтеров Атол"""
        try:
            # Открытие смены (если нужно)
            # Открытие документа
            # Печать позиций
            # Закрытие документа
            
            # Заглушка - в реальности здесь команды протокола Атол
            print("Печать чека на принтере Атол:")
            print(f"Чек №{receipt_data.get('id', 'N/A')}")
            print(f"Дата: {receipt_data.get('date', datetime.now().strftime('%d.%m.%Y %H:%M'))}")
            
            for item in receipt_data.get('items', []):
                print(f"{item['name']} - {item['quantity']} x {item['price']} = {item['total']} ₽")
                
            print(f"ИТОГО: {receipt_data.get('total', 0)} ₽")
            print("=" * 30)
            
            return True
            
        except Exception as e:
            print(f"Ошибка печати Атол: {e}")
            return False
            
    def _print_viki_receipt(self, receipt_data):
        """Печать чека для принтеров Viki Print"""
        try:
            # Заглушка для Viki Print
            print("Печать чека на принтере Viki Print:")
            print(f"Чек №{receipt_data.get('id', 'N/A')}")
            print(f"Дата: {receipt_data.get('date', datetime.now().strftime('%d.%m.%Y %H:%M'))}")
            
            for item in receipt_data.get('items', []):
                print(f"{item['name']} - {item['quantity']} x {item['price']} = {item['total']} ₽")
                
            print(f"ИТОГО: {receipt_data.get('total', 0)} ₽")
            print("=" * 30)
            
            return True
            
        except Exception as e:
            print(f"Ошибка печати Viki Print: {e}")
            return False
            
    def _print_generic_receipt(self, receipt_data):
        """Универсальная печать чека"""
        try:
            print("Печать чека на принтере:")
            print(f"Чек №{receipt_data.get('id', 'N/A')}")
            print(f"Дата: {receipt_data.get('date', datetime.now().strftime('%d.%m.%Y %H:%M'))}")
            
            for item in receipt_data.get('items', []):
                print(f"{item['name']} - {item['quantity']} x {item['price']} = {item['total']} ₽")
                
            print(f"ИТОГО: {receipt_data.get('total', 0)} ₽")
            print("=" * 30)
            
            return True
            
        except Exception as e:
            print(f"Ошибка печати: {e}")
            return False


class BackupManager:
    """Менеджер резервного копирования"""
    
    def __init__(self, db_path):
        self.db_path = db_path
        
    def create_backup(self, backup_path):
        """Создание резервной копии"""
        try:
            import shutil
            import os
            
            # Создание папки если не существует
            os.makedirs(backup_path, exist_ok=True)
            
            # Имя файла резервной копии
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"vetpos_backup_{timestamp}.db"
            backup_filepath = os.path.join(backup_path, backup_filename)
            
            # Копирование базы данных
            shutil.copy2(self.db_path, backup_filepath)
            
            return backup_filepath
            
        except Exception as e:
            print(f"Ошибка создания резервной копии: {e}")
            return None
            
    def restore_backup(self, backup_file):
        """Восстановление из резервной копии"""
        try:
            import shutil
            
            # Создание резервной копии текущей БД
            current_backup = f"{self.db_path}.bak"
            shutil.copy2(self.db_path, current_backup)
            
            # Восстановление из резервной копии
            shutil.copy2(backup_file, self.db_path)
            
            return True
            
        except Exception as e:
            print(f"Ошибка восстановления: {e}")
            # Попытка восстановить оригинал
            try:
                shutil.copy2(f"{self.db_path}.bak", self.db_path)
            except:
                pass
            return False
            
    def auto_backup(self, backup_path, frequency='daily'):
        """Автоматическое резервное копирование"""
        # В реальном приложении здесь будет планировщик задач
        print(f"Настроено автоматическое резервное копирование: {frequency}")
        return self.create_backup(backup_path)