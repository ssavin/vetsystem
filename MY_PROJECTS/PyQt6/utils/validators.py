import re
from datetime import datetime
from typing import Optional, Tuple

class Validators:
    """Класс для валидации данных ветеринарной клиники"""
    
    @staticmethod
    def validate_phone(phone: str) -> Tuple[bool, str]:
        """
        Валидация номера телефона
        Возвращает (is_valid, error_message)
        """
        if not phone:
            return False, "Телефон не может быть пустым"
        
        # Очищаем от всего, кроме цифр
        cleaned_phone = re.sub(r'\D', '', phone)
        
        # Проверяем длину (10 или 11 цифр)
        if len(cleaned_phone) not in [10, 11]:
            return False, "Телефон должен содержать 10 или 11 цифр"
        
        # Проверяем код страны для 11-значных номеров
        if len(cleaned_phone) == 11 and not cleaned_phone.startswith(('7', '8')):
            return False, "Неверный код страны"
        
        return True, ""
    
    @staticmethod
    def validate_email(email: str) -> Tuple[bool, str]:
        """
        Валидация email адреса
        Возвращает (is_valid, error_message)
        """
        if not email:
            return True, ""  # Email не обязателен
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if re.match(pattern, email):
            return True, ""
        else:
            return False, "Неверный формат email"
    
    @staticmethod
    def validate_name(name: str, field_name: str = "Имя") -> Tuple[bool, str]:
        """
        Валидация имени/фамилии/клички
        Возвращает (is_valid, error_message)
        """
        if not name or not name.strip():
            return False, f"{field_name} не может быть пустым"
        
        if len(name.strip()) < 2:
            return False, f"{field_name} должен содержать минимум 2 символа"
        
        # Проверяем на наличие запрещенных символов
        if re.search(r'[0-9!@#$%^&*()_+=\[\]{};:"\\|,.<>/?]', name):
            return False, f"{field_name} не может содержать цифры или специальные символы"
        
        return True, ""
    
    @staticmethod
    def validate_date(date_str: str, field_name: str = "Дата") -> Tuple[bool, str, Optional[datetime]]:
        """
        Валидация даты
        Возвращает (is_valid, error_message, datetime_object)
        """
        if not date_str:
            return True, "", None  # Дата не обязательна
        
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            
            # Проверяем, что дата не в будущем (для даты рождения)
            if date_obj > datetime.now():
                return False, f"{field_name} не может быть в будущем", None
            
            return True, "", date_obj
        except ValueError:
            return False, f"Неверный формат даты. Используйте ГГГГ-ММ-ДД", None
    
    @staticmethod
    def validate_age(age: str) -> Tuple[bool, str]:
        """
        Валидация возраста
        Возвращает (is_valid, error_message)
        """
        if not age:
            return True, ""  # Возраст не обязателен
        
        try:
            age_int = int(age)
            if age_int < 0:
                return False, "Возраст не может быть отрицательным"
            if age_int > 50:  # Максимальный разумный возраст для животных
                return False, "Возраст слишком большой"
            return True, ""
        except ValueError:
            return False, "Возраст должен быть числом"
    
    @staticmethod
    def validate_chip_number(chip_number: str) -> Tuple[bool, str]:
        """
        Валидация номера чипа
        Возвращает (is_valid, error_message)
        """
        if not chip_number:
            return True, ""  # Чип не обязателен
        
        # Очищаем от пробелов и дефисов
        cleaned_chip = re.sub(r'[\s-]', '', chip_number)
        
        # Проверяем, что содержит только цифры и буквы
        if not re.match(r'^[A-Za-z0-9]+$', cleaned_chip):
            return False, "Номер чипа может содержать только буквы и цифры"
        
        # Проверяем длину (обычно 9-15 символов)
        if len(cleaned_chip) < 9 or len(cleaned_chip) > 15:
            return False, "Номер чипа должен содержать от 9 до 15 символов"
        
        return True, ""
    
    @staticmethod
    def validate_required_field(value: str, field_name: str) -> Tuple[bool, str]:
        """
        Проверка обязательного поля
        Возвращает (is_valid, error_message)
        """
        if not value or not value.strip():
            return False, f"{field_name} обязательно для заполнения"
        return True, ""

# Создаем экземпляр валидатора для импорта
validators = Validators()