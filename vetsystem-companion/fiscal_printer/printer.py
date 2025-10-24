#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Модуль для прямой печати фискальных чеков на принтеры:
- Vikiprint 57
- ATOL 30F

Печатает через COM-порт без использования облачных интеграций
"""

import serial
import sys
import json
import time
from datetime import datetime
from typing import List, Dict, Any

class FiscalPrinterError(Exception):
    """Ошибка работы с фискальным принтером"""
    pass

class FiscalPrinter:
    """Базовый класс для фискального принтера"""
    
    def __init__(self, port: str, baudrate: int = 115200, timeout: int = 2):
        """
        Инициализация принтера
        
        Args:
            port: COM-порт (например, 'COM3')
            baudrate: Скорость обмена данными
            timeout: Таймаут ожидания ответа
        """
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.connection = None
        
    def connect(self):
        """Подключение к принтеру"""
        try:
            self.connection = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=self.timeout
            )
            time.sleep(0.5)  # Даем принтеру время на инициализацию
            return True
        except serial.SerialException as e:
            raise FiscalPrinterError(f"Не удалось подключиться к принтеру на {self.port}: {e}")
    
    def disconnect(self):
        """Отключение от принтера"""
        if self.connection and self.connection.is_open:
            self.connection.close()
    
    def send_command(self, command: bytes) -> bytes:
        """Отправка команды принтеру"""
        if not self.connection or not self.connection.is_open:
            raise FiscalPrinterError("Принтер не подключен")
        
        self.connection.write(command)
        time.sleep(0.3)
        
        # Читаем ответ
        response = b''
        while self.connection.in_waiting > 0:
            response += self.connection.read(self.connection.in_waiting)
            time.sleep(0.1)
        
        return response
    
    def print_receipt(self, receipt_data: Dict[str, Any]) -> Dict[str, Any]:
        """Печать фискального чека"""
        raise NotImplementedError("Должен быть реализован в подклассе")

class VikiprintPrinter(FiscalPrinter):
    """Принтер Vikiprint 57"""
    
    def __init__(self, port: str):
        super().__init__(port, baudrate=115200)
    
    def print_receipt(self, receipt_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Печать чека на Vikiprint 57
        
        Args:
            receipt_data: Данные чека
            {
                "items": [{"name": "...", "price": 100.00, "quantity": 1}],
                "payment_method": "cash",  # cash | card
                "total": 100.00
            }
        """
        try:
            self.connect()
            
            # Vikiprint 57 - упрощенная печать через COM
            # ВАЖНО: Для полной фискальной функциональности требуется драйвер VikiDriver
            # Здесь реализована базовая печать для демонстрации
            
            items = receipt_data.get('items', [])
            total = receipt_data.get('total', 0.00)
            payment_method = receipt_data.get('payment_method', 'cash')
            
            # Формируем текст чека
            receipt_text = self._format_receipt_text(items, total, payment_method)
            
            # Печатаем (используем CP866 для кириллицы)
            text_bytes = receipt_text.encode('cp866', errors='replace')
            self.send_command(text_bytes)
            
            # Отрезаем бумагу (ESC/POS команда, может не сработать)
            self.send_command(b'\x1D\x56\x00')  # GS V 0 - полная отрезка
            
            return {
                "success": True,
                "message": "Чек успешно напечатан",
                "printer": "Vikiprint 57"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Ошибка печати на Vikiprint 57: {e}"
            }
        finally:
            self.disconnect()
    
    def _format_receipt_text(self, items: List[Dict], total: float, payment_method: str) -> str:
        """Форматирование текста чека"""
        lines = []
        lines.append("=" * 40)
        lines.append("        ФИСКАЛЬНЫЙ ЧЕК")
        lines.append("=" * 40)
        lines.append(f"Дата: {datetime.now().strftime('%d.%m.%Y %H:%M')}")
        lines.append("-" * 40)
        
        for item in items:
            name = item.get('name', 'Товар')
            price = float(item.get('price', 0))
            qty = float(item.get('quantity', 1))
            total_item = price * qty
            
            lines.append(f"{name}")
            lines.append(f"  {qty} x {price:.2f} = {total_item:.2f} руб")
        
        lines.append("-" * 40)
        lines.append(f"ИТОГО:                    {total:.2f} руб")
        lines.append(f"Способ оплаты: {' Наличные' if payment_method == 'cash' else 'Безналичные'}")
        lines.append("=" * 40)
        lines.append("       Спасибо за покупку!")
        lines.append("=" * 40)
        lines.append("\n\n\n")  # Прогон бумаги
        
        return "\n".join(lines)

class AtolPrinter(FiscalPrinter):
    """Принтер ATOL 30F"""
    
    def __init__(self, port: str):
        super().__init__(port, baudrate=115200)
    
    def print_receipt(self, receipt_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Печать чека на ATOL 30F
        
        Args:
            receipt_data: Данные чека
        """
        try:
            self.connect()
            
            # ATOL 30F - упрощенная печать через COM
            # ВАЖНО: Для полной фискальной функциональности требуется драйвер ATOL KKT
            # Здесь реализована базовая печать для демонстрации
            
            items = receipt_data.get('items', [])
            total = receipt_data.get('total', 0.00)
            payment_method = receipt_data.get('payment_method', 'cash')
            
            # Формируем текст чека
            receipt_text = self._format_receipt_text(items, total, payment_method)
            
            # Печатаем (используем CP866 для кириллицы)
            text_bytes = receipt_text.encode('cp866', errors='replace')
            self.send_command(text_bytes)
            
            # Отрезаем бумагу
            self.send_command(b'\x1D\x56\x00')
            
            return {
                "success": True,
                "message": "Чек успешно напечатан",
                "printer": "ATOL 30F"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Ошибка печати на ATOL 30F: {e}"
            }
        finally:
            self.disconnect()
    
    def _format_receipt_text(self, items: List[Dict], total: float, payment_method: str) -> str:
        """Форматирование текста чека"""
        lines = []
        lines.append("=" * 40)
        lines.append("        ФИСКАЛЬНЫЙ ЧЕК")
        lines.append("         ATOL 30F")
        lines.append("=" * 40)
        lines.append(f"Дата: {datetime.now().strftime('%d.%m.%Y %H:%M')}")
        lines.append("-" * 40)
        
        for item in items:
            name = item.get('name', 'Товар')
            price = float(item.get('price', 0))
            qty = float(item.get('quantity', 1))
            total_item = price * qty
            
            lines.append(f"{name}")
            lines.append(f"  {qty} x {price:.2f} = {total_item:.2f} руб")
        
        lines.append("-" * 40)
        lines.append(f"ИТОГО:                    {total:.2f} руб")
        lines.append(f"Оплата: {'Наличные' if payment_method == 'cash' else 'Безналичные'}")
        lines.append("=" * 40)
        lines.append("       Благодарим за покупку!")
        lines.append("=" * 40)
        lines.append("\n\n\n")
        
        return "\n".join(lines)

def print_fiscal_receipt(printer_model: str, port: str, receipt_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Печать фискального чека
    
    Args:
        printer_model: Модель принтера ('vikiprint' или 'atol')
        port: COM-порт (например, 'COM3')
        receipt_data: Данные чека
    
    Returns:
        Результат печати
    """
    try:
        if printer_model.lower() == 'vikiprint':
            printer = VikiprintPrinter(port)
        elif printer_model.lower() == 'atol':
            printer = AtolPrinter(port)
        else:
            return {
                "success": False,
                "error": f"Неизвестная модель принтера: {printer_model}",
                "message": "Поддерживаются: 'vikiprint', 'atol'"
            }
        
        return printer.print_receipt(receipt_data)
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Ошибка печати чека: {e}"
        }

if __name__ == "__main__":
    # Запуск из командной строки
    # python printer.py <model> <port> <receipt_json>
    
    if len(sys.argv) < 4:
        print(json.dumps({
            "success": False,
            "error": "Недостаточно аргументов",
            "usage": "python printer.py <model> <port> <receipt_json>"
        }))
        sys.exit(1)
    
    model = sys.argv[1]
    port = sys.argv[2]
    receipt_json = sys.argv[3]
    
    try:
        receipt_data = json.loads(receipt_json)
        result = print_fiscal_receipt(model, port, receipt_data)
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0 if result.get('success') else 1)
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Неверный JSON: {e}",
            "message": "Не удалось разобрать данные чека"
        }))
        sys.exit(1)
