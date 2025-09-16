import PySimpleGUI as sg
import sys
import os
from pathlib import Path
from datetime import datetime

# Добавляем корневую директорию проекта в sys.path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Импортируем наши сервисы
from services.client_service import ClientService
from services.patient_service import PatientService
from services.search_service import SearchService

# Настройка темы
sg.theme('LightGrey1')  # Можно выбрать другую тему: sg.theme_previewer()

class VetClinicApp:
    def __init__(self):
        self.client_service = ClientService()
        self.patient_service = PatientService()
        self.search_service = SearchService()
        
        self.clients = []
        self.patients = []
        self.current_tab = 'clients'
        
        self.setup_layout()
        self.window = sg.Window(
            '🐾 Ветеринарная Клиника - Система Управления',
            self.layout,
            size=(1200, 700),
            resizable=True,
            finalize=True
        )
        self.load_data()
    
    def setup_layout(self):
        # Таб клиентов
        clients_tab = [
            [sg.Text('👥 КЛИЕНТЫ', font='Any 14 bold')],
            [sg.HorizontalSeparator()],
            [
                sg.Input(size=(30, 1), key='-CLIENT_SEARCH-', enable_events=True, 
                         tooltip='Поиск по ФИО, телефону, email'),
                sg.Button('🔍 Поиск', key='-CLIENT_SEARCH_BTN-'),
                sg.Button('🔄 Обновить', key='-REFRESH_CLIENTS-'),
                sg.Button('➕ Добавить', key='-ADD_CLIENT-')
            ],
            [
                sg.Table(
                    values=[],
                    headings=['ID', 'Фамилия', 'Имя', 'Отчество', 'Телефон', 'Email', 'Статус'],
                    key='-CLIENTS_TABLE-',
                    auto_size_columns=False,
                    col_widths=[5, 12, 12, 12, 15, 20, 10],
                    justification='left',
                    num_rows=20,
                    enable_events=True,
                    enable_click_events=True,
                    tooltip='Двойной клик для редактирования'
                )
            ]
        ]
        
        # Таб пациентов
        patients_tab = [
            [sg.Text('🐶 ПАЦИЕНТЫ', font='Any 14 bold')],
            [sg.HorizontalSeparator()],
            [
                sg.Input(size=(30, 1), key='-PATIENT_SEARCH-', enable_events=True,
                         tooltip='Поиск по кличке, виду, породе, чипу'),
                sg.Button('🔍 Поиск', key='-PATIENT_SEARCH_BTN-'),
                sg.Button('🔄 Обновить', key='-REFRESH_PATIENTS-'),
                sg.Button('➕ Добавить', key='-ADD_PATIENT-')
            ],
            [
                sg.Table(
                    values=[],
                    headings=['ID', 'Кличка', 'Вид', 'Порода', 'Пол', 'Возраст', 'Чип', 'Статус'],
                    key='-PATIENTS_TABLE-',
                    auto_size_columns=False,
                    col_widths=[5, 15, 10, 15, 8, 8, 15, 10],
                    justification='left',
                    num_rows=20,
                    enable_events=True,
                    enable_click_events=True,
                    tooltip='Двойной клик для редактирования'
                )
            ]
        ]
        
        # Главный layout
        self.layout = [
            [sg.Menu([
                ['Файл', ['Выход']],
                ['Справочники', ['Клиенты', 'Пациенты']],
                ['Сервис', ['Обновить данные', 'Резервная копия']],
                ['Помощь', ['О программе']]
            ])],
            
            [sg.TabGroup([[
                sg.Tab('👥 Клиенты', clients_tab, key='-TAB_CLIENTS-'),
                sg.Tab('🐶 Пациенты', patients_tab, key='-TAB_PATIENTS-')
            ]], enable_events=True, key='-TABGROUP-')],
            
            [sg.StatusBar('Готово', key='-STATUS-', size=(50, 1))]
        ]
    
    def load_data(self):
        try:
            # Загружаем клиентов
            self.clients = self.client_service.get_all_clients()
            client_data = []
            for client in self.clients:
                client_data.append([
                    client.id,
                    client.last_name,
                    client.first_name,
                    client.middle_name,
                    client.phone,
                    client.email,
                    client.status
                ])
            self.window['-CLIENTS_TABLE-'].update(values=client_data)
            
            # Загружаем пациентов
            self.patients = self.patient_service.get_all_patients()
            patient_data = []
            for patient in self.patients:
                patient_data.append([
                    patient.id,
                    patient.name,
                    patient.species,
                    patient.breed,
                    patient.gender,
                    patient.age,
                    patient.chip_number,
                    patient.status
                ])
            self.window['-PATIENTS_TABLE-'].update(values=patient_data)
            
            self.update_status(f'Загружено: {len(self.clients)} клиентов, {len(self.patients)} пациентов')
            
        except Exception as e:
            self.update_status(f'Ошибка загрузки: {str(e)}')
            sg.popup_error('Ошибка загрузки данных', str(e))
    
    def update_status(self, message):
        self.window['-STATUS-'].update(message)
    
    def search_clients(self, search_term):
        if not search_term:
            self.load_data()
            return
        
        try:
            results = self.search_service.search_clients(search_term)
            client_data = []
            for client in results:
                client_data.append([
                    client.id,
                    client.last_name,
                    client.first_name,
                    client.middle_name,
                    client.phone,
                    client.email,
                    client.status
                ])
            self.window['-CLIENTS_TABLE-'].update(values=client_data)
            self.update_status(f'Найдено клиентов: {len(results)}')
            
        except Exception as e:
            sg.popup_error('Ошибка поиска', str(e))
    
    def search_patients(self, search_term):
        if not search_term:
            self.load_data()
            return
        
        try:
            results = self.search_service.search_patients(search_term)
            patient_data = []
            for patient in results:
                patient_data.append([
                    patient.id,
                    patient.name,
                    patient.species,
                    patient.breed,
                    patient.gender,
                    patient.age,
                    patient.chip_number,
                    patient.status
                ])
            self.window['-PATIENTS_TABLE-'].update(values=patient_data)
            self.update_status(f'Найдено пациентов: {len(results)}')
            
        except Exception as e:
            sg.popup_error('Ошибка поиска', str(e))
    
    def run(self):
        while True:
            event, values = self.window.read()
            
            if event in (sg.WIN_CLOSED, 'Выход'):
                break
            
            # Обработка событий табов
            elif event == '-TABGROUP-':
                self.current_tab = values['-TABGROUP-'].lower()
            
            # События клиентов
            elif event == '-CLIENT_SEARCH_BTN-':
                self.search_clients(values['-CLIENT_SEARCH-'])
            elif event == '-CLIENT_SEARCH-':
                if values['-CLIENT_SEARCH-'] == '':
                    self.load_data()
            elif event == '-REFRESH_CLIENTS-':
                self.load_data()
            elif event == '-ADD_CLIENT-':
                self.open_client_dialog()
            elif event == '-CLIENTS_TABLE-':
                if isinstance(values['-CLIENTS_TABLE-'], tuple) and len(values['-CLIENTS_TABLE-']) == 2:
                    row, col = values['-CLIENTS_TABLE-']
                    if row < len(self.clients):
                        self.open_client_dialog(self.clients[row])
            
            # События пациентов
            elif event == '-PATIENT_SEARCH_BTN-':
                self.search_patients(values['-PATIENT_SEARCH-'])
            elif event == '-PATIENT_SEARCH-':
                if values['-PATIENT_SEARCH-'] == '':
                    self.load_data()
            elif event == '-REFRESH_PATIENTS-':
                self.load_data()
            elif event == '-ADD_PATIENT-':
                self.open_patient_dialog()
            elif event == '-PATIENTS_TABLE-':
                if isinstance(values['-PATIENTS_TABLE-'], tuple) and len(values['-PATIENTS_TABLE-']) == 2:
                    row, col = values['-PATIENTS_TABLE-']
                    if row < len(self.patients):
                        self.open_patient_dialog(self.patients[row])
            
            # Прочие события
            elif event == 'Обновить данные':
                self.load_data()
            
        self.window.close()
    
    def open_client_dialog(self, client=None):
        # Импортируем здесь чтобы избежать циклических импортов
        from sg_client_dialog import ClientDialog
        dialog = ClientDialog(client)
        if dialog.result:
            self.load_data()
    
    def open_patient_dialog(self, patient=None):
        from sg_patient_dialog import PatientDialog
        dialog = PatientDialog(patient)
        if dialog.result:
            self.load_data()

def main():
    try:
        app = VetClinicApp()
        app.run()
    except Exception as e:
        sg.popup_error('Критическая ошибка', f'Не удалось запустить приложение:\n{str(e)}')
        print(f"Ошибка: {e}")

if __name__ == "__main__":
    main()