import PySimpleGUI as sg
from models.client import Client
from services.client_service import ClientService
from utils.validators import validators

class ClientDialog:
    def __init__(self, client=None):
        self.client = client
        self.client_service = ClientService()
        self.result = False
        
        self.layout = self.create_layout()
        self.window = sg.Window(
            '✏️ Редактирование клиента' if client else '➕ Добавление клиента',
            self.layout,
            size=(500, 500),
            modal=True
        )
        self.run()
    
    def create_layout(self):
        return [
            [sg.Text('Основная информация', font='Any 12 bold')],
            [sg.HorizontalSeparator()],
            [
                sg.Text('Фамилия*:', size=15),
                sg.Input(key='-LAST_NAME-', size=30, default_text=self.client.last_name if self.client else '')
            ],
            [
                sg.Text('Имя*:', size=15),
                sg.Input(key='-FIRST_NAME-', size=30, default_text=self.client.first_name if self.client else '')
            ],
            [
                sg.Text('Отчество:', size=15),
                sg.Input(key='-MIDDLE_NAME-', size=30, default_text=self.client.middle_name if self.client else '')
            ],
            [
                sg.Text('Телефон*:', size=15),
                sg.Input(key='-PHONE-', size=30, default_text=self.client.phone if self.client else '')
            ],
            [
                sg.Text('Email:', size=15),
                sg.Input(key='-EMAIL-', size=30, default_text=self.client.email if self.client else '')
            ],
            [
                sg.Text('Адрес:', size=15),
                sg.Input(key='-ADDRESS-', size=30, default_text=self.client.address if self.client else '')
            ],
            [
                sg.Text('Статус:', size=15),
                sg.Combo(
                    ['активный', 'неактивный', 'VIP', 'должник', 'архивный'],
                    default_value=self.client.status if self.client else 'активный',
                    key='-STATUS-',
                    size=28
                )
            ],
            [sg.Text('Заметки:', font='Any 12 bold')],
            [sg.HorizontalSeparator()],
            [sg.Multiline(
                key='-NOTES-',
                size=(45, 4),
                default_text=self.client.notes if self.client else ''
            )],
            [
                sg.Button('💾 Сохранить', key='-SAVE-', button_color=('white', 'green')),
                sg.Button('❌ Отмена', key='-CANCEL-', button_color=('white', 'red'))
            ]
        ]
    
    def validate(self):
        # Проверка обязательных полей
        if not sg.Window.get_screen_size()[0].get('-LAST_NAME-', '').strip():
            sg.popup_error('Ошибка', 'Фамилия обязательна для заполнения')
            return False
        
        if not sg.Window.get_screen_size()[0].get('-FIRST_NAME-', '').strip():
            sg.popup_error('Ошибка', 'Имя обязательно для заполнения')
            return False
        
        if not sg.Window.get_screen_size()[0].get('-PHONE-', '').strip():
            sg.popup_error('Ошибка', 'Телефон обязателен для заполнения')
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
                        client_data = Client(
                            id=self.client.id if self.client else None,
                            last_name=values['-LAST_NAME-'].strip(),
                            first_name=values['-FIRST_NAME-'].strip(),
                            middle_name=values['-MIDDLE_NAME-'].strip(),
                            phone=values['-PHONE-'].strip(),
                            email=values['-EMAIL-'].strip(),
                            address=values['-ADDRESS-'].strip(),
                            status=values['-STATUS-'],
                            notes=values['-NOTES-'].strip()
                        )
                        
                        if self.client:
                            success = self.client_service.update_client(client_data)
                            message = 'Данные клиента обновлены' if success else 'Ошибка обновления'
                        else:
                            success = self.client_service.create_client(client_data)
                            message = 'Клиент добавлен' if success else 'Ошибка добавления'
                        
                        if success:
                            sg.popup('Успех', message)
                            self.result = True
                            break
                        else:
                            sg.popup_error('Ошибка', message)
                            
                    except Exception as e:
                        sg.popup_error('Ошибка', f'Произошла ошибка: {str(e)}')
        
        self.window.close()