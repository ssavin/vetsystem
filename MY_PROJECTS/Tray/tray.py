import pystray
from pystray import MenuItem as item
from PIL import Image, ImageDraw
import subprocess
import os

def create_image():
    # Создаем иконку для трея
    width = 64
    height = 64
    color1 = (0, 128, 255)  # Синий цвет
    color2 = (255, 255, 255)  # Белый цвет
    
    image = Image.new('RGB', (width, height), color1)
    dc = ImageDraw.Draw(image)
    dc.rectangle([width//2, 0, width, height//2], fill=color2)
    dc.rectangle([0, height//2, width//2, height], fill=color2)
    
    return image

def open_calculator():
    """Открыть калькулятор"""
    subprocess.Popen('C:\\Windows\\system32\\calc1.exe')

def open_notepad():
    """Открыть блокнот"""
    subprocess.Popen('C:\\Windows\\system32\\notepad.exe')

def open_cmd():
    """Открыть командную строку"""
    subprocess.Popen('C:\\Windows\\system32\\cmd.exe')

def open_file_explorer():
    """Открыть проводник"""
    subprocess.Popen('C:\\Windows\\system32\\explorer.exe')

def open_custom_program():
    """Открыть пользовательскую программу"""
    # Укажите путь к вашей программе
    program_path = "C:\\Path\\To\\Your\\Program.exe"
    if os.path.exists(program_path):
        subprocess.Popen(program_path)
    else:
        print("Программа не найдена!")

def on_quit():
    """Выход из приложения"""
    icon.stop()

# Создаем меню для иконки в трее
menu = (
    item('Калькулятор', open_calculator),
    item('Блокнот', open_notepad),
    item('Командная строка', open_cmd),
    item('Проводник', open_file_explorer),
    item('Моя программа', open_custom_program),
    item('Выход', on_quit)
)

# Создаем иконку в трее
icon = pystray.Icon("my_tray_app", create_image(), "Мое приложение", menu)

# Запускаем приложение
icon.run()