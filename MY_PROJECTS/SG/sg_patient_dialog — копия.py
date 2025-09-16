import PySimpleGUI as sg
from models.patient import Patient
from services.patient_service import PatientService
from utils.validators import validators
from datetime import datetime

class PatientDialog:
    def __init__(self, patient=None):
        self.patient = patient
        self.patient_service = PatientService()
        self.result = False
        
        self.layout = self.create_layout()
        self.window = sg.Window(
            '✏️ Редактирование пациента' if patient else '➕ Добавление пациента',
            self.layout,
            size=(600, 700),
            modal=True,
            resizable=True
        )
        self.run()
    
    def create_layout(self):
        return [
            [sg.Text('Основная информация', font='Any 12 bold')],
            [sg.HorizontalSeparator()],
            [
                sg.Text('Кличка*:', size=20),
                sg.Input(key='-NAME-', size=30, default_text=self.patient.name if self.patient else '')
            ],
            [
                sg.Text('Вид*:', size=20),
                sg.Combo(
                    ['Собака', 'Кошка', 'Попугай', 'Хомяк', 'Кролик', 'Черепаха', 'Другое'],
                    default_value=self.patient.species if self.patient else '',
                    key='-SPECIES-',
                    size=28
                )
            ],
            [
                sg.Text('Порода:', size=20),
                sg.Input(key='-BREED-', size=30, default_text=self.patient.breed if self.patient else '')
            ],
            [
                sg.Text('Пол:', size=20),
                sg.Combo(
                    ['самец', 'самка', 'неизвестно'],
                    default_value=self.patient.gender if self.patient else 'неизвестно',
                    key='-GENDER-',
                    size=28
                )
            ],
            [
                sg.Text('Дата рождения:', size=20),
                sg.Input(key='-BIRTH_DATE-', size=30, 
                        default_text=self.patient.birth_date.strftime('%Y-%m-%d') 
                        if self.patient and self.patient.birth_date else '')
            ],
            [
                sg.Text('Возраст:', size=20),
                sg.Input(key='-AGE-', size=30, 
                        default_text=str(self.patient.age) if self.patient and self.patient.age else '')
            ],
            [
                sg.Text('Окрас:', size=20),
                sg.Input(key='-COLOR-', size=30, default_text=self.patient.color if self.patient else '')
            ],
            [
                sg.Text('Особые приметы:', size=20),
                sg.Input(key='-SPECIAL_MARKS-', size=30, 
                        default_text=self.patient.special_marks if self.patient else '')
            ],
            [
                sg.Text('Номер чипа:', size=20),
                sg.Input(key='-CHIP_NUMBER-', size=30, 
                        default_text=self.patient.chip_number if self.patient else '')
            ],
            [
                sg.Text('Кастрация/стерилизация:', size=20),
                sg.Checkbox('', default=self.patient.is_neutered if self.patient else False, 
                           key='-IS_NEUTERED-')
            ],
            [
                sg.Text('Аллергии:', size=20),
                sg.Input(key='-ALLERGIES-', size=30, 
                        default_text=self.patient.allergies if self.patient else '')
            ],
            [
                sg.Text('Хронические заболевания:', size=20),
                sg.Input(key='-CHRONIC_DISEASES-', size=30, 
                        default_text=self.patient.chronic_diseases if self.patient else '')
            ],
            [
                sg.Text('Статус:', size=20),
                sg.Combo(
                    ['активный', 'неактивный', 'умер', 'передан', 'архивный'],
                    default_value=self.patient.status if self.patient else 'активный',
                    key='-STATUS-',
                    size=28
                )
            ],
            [sg.Text('Заметки:', font='Any 12 bold')],
            [sg.HorizontalSeparator()],
            [sg.Multiline(
                key='-NOTES-',
                size=(55, 4),
                default_text=self.patient.notes if self.patient else ''
            )],
            [
                sg.Button('💾 Сохранить', key='-SAVE-', button_color=('white', 'green')),
                sg.Button('❌ Отмена', key='-CANCEL-', button_color=('white', 'red'))
            ]
        ]
    
    def validate(self):
        values = {k: v for k, v in self.window.__dict__['_get_events']().items() if k.startswith('-')}
        
        if not values.get('-NAME-', '').strip():
            sg.popup_error('Ошибка', 'Кличка обязательна для заполнения')
            return False
        
        if not values.get('-SPECIES-', '').strip():
            sg.popup_error('Ошибка', 'Вид обязателен для заполнения')
            return False
        
        return True
    
    def run(self):
        while True:
            event, values = self.window.read()
            
            if event in (sg.WIN_CLOSED, '-CANCEL-'):
                break
            
            elif event == '-SAVE-':
                if self.validate():
                    try:
                        # Обработка данных
                        birth_date = None
                        if values['-BIRTH_DATE-']:
                            try:
                                birth_date = datetime.strptime(values['-BIRTH_DATE-'], '%Y-%m-%d').date()
                            except ValueError:
                                sg.popup_error('Ошибка', 'Неверный формат даты. Используйте ГГГГ-ММ-ДД')
                                continue
                        
                        age = None
                        if values['-AGE-']:
                            try:
                                age = int(values['-AGE-'])
                            except ValueError:
                                sg.popup_error('Ошибка', 'Возраст должен быть числом')
                                continue
                        
                        patient_data = Patient(
                            id=self.patient.id if self.patient else None,
                            name=values['-NAME-'].strip(),
                            species=values['-SPECIES-'],
                            breed=values['-BREED-'].strip(),
                            gender=values['-GENDER-'],
                            birth_date=birth_date,
                            age=age,
                            color=values['-COLOR-'].strip(),
                            special_marks=values['-SPECIAL_MARKS-'].strip(),
                            chip_number=values['-CHIP_NUMBER-'].strip(),
                            is_neutered=values['-IS_NEUTERED-'],
                            allergies=values['-ALLERGIES-'].strip(),
                            chronic_diseases=values['-CHRONIC_DISEASES-'].strip(),
                            status=values['-STATUS-'],
                            notes=values['-NOTES-'].strip()
                        )
                        
                        if self.patient:
                            success = self.patient_service.update_patient(patient_data)
                            message = 'Данные пациента обновлены' if success else 'Ошибка обновления'
                        else:
                            success = self.patient_service.create_patient(patient_data)
                            message = 'Пациент добавлен' if success else 'Ошибка добавления'
                        
                        if success:
                            sg.popup('Успех', message)
                            self.result = True
                            break
                        else:
                            sg.popup_error('Ошибка', message)
                            
                    except Exception as e:
                        sg.popup_error('Ошибка', f'Произошла ошибка: {str(e)}')
        
        self.window.close()