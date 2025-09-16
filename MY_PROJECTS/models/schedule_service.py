import sqlite3
from datetime import datetime, timedelta, time
from typing import List, Optional, Dict
from models.schedule_models import *

class ScheduleService:
    def __init__(self, db_path: str = "vet_clinic.db"):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        """Инициализация всех таблиц расписания"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Таблица расписания врачей
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS doctor_schedules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doctor_id INTEGER NOT NULL,
                    day_of_week INTEGER NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    is_working BOOLEAN DEFAULT 1,
                    room_id INTEGER,
                    FOREIGN KEY (doctor_id) REFERENCES staff (id),
                    FOREIGN KEY (room_id) REFERENCES rooms (id)
                )
            ''')
            
            # Таблица отпусков и больничных
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS time_offs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    staff_id INTEGER NOT NULL,
                    start_date TEXT NOT NULL,
                    end_date TEXT NOT NULL,
                    reason TEXT DEFAULT '',
                    is_approved BOOLEAN DEFAULT 0,
                    FOREIGN KEY (staff_id) REFERENCES staff (id)
                )
            ''')
            
            # Таблица кабинетов
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS rooms (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    number TEXT NOT NULL,
                    equipment TEXT DEFAULT '',
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            # Таблица записей на прием
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS appointments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER NOT NULL,
                    patient_id INTEGER NOT NULL,
                    doctor_id INTEGER NOT NULL,
                    assistant_id INTEGER,
                    room_id INTEGER,
                    appointment_date TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    duration INTEGER DEFAULT 30,
                    type TEXT DEFAULT 'первичный',
                    status TEXT DEFAULT 'запланирован',
                    reason TEXT DEFAULT '',
                    notes TEXT DEFAULT '',
                    equipment_needed TEXT DEFAULT '',
                    repeat_pattern TEXT DEFAULT 'без повторения',
                    repeat_until TEXT,
                    reminder_sent BOOLEAN DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES clients (id),
                    FOREIGN KEY (patient_id) REFERENCES patients (id),
                    FOREIGN KEY (doctor_id) REFERENCES staff (id),
                    FOREIGN KEY (assistant_id) REFERENCES staff (id),
                    FOREIGN KEY (room_id) REFERENCES rooms (id)
                )
            ''')
            
            # Индексы для быстрого поиска
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointment_date)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments (doctor_id, appointment_date)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status)')
            
            conn.commit()
    
    # Методы для работы с расписанием врачей
    def set_doctor_schedule(self, schedule: DoctorSchedule) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO doctor_schedules 
                (id, doctor_id, day_of_week, start_time, end_time, is_working, room_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (schedule.id, schedule.doctor_id, schedule.day_of_week, 
                  schedule.start_time.strftime('%H:%M'), schedule.end_time.strftime('%H:%M'),
                  schedule.is_working, schedule.room_id))
            schedule_id = cursor.lastrowid if not schedule.id else schedule.id
            conn.commit()
            return schedule_id
    
    def get_doctor_schedule(self, doctor_id: int) -> List[DoctorSchedule]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM doctor_schedules WHERE doctor_id = ?', (doctor_id,))
            return [self._row_to_doctor_schedule(row) for row in cursor.fetchall()]
    
    # Методы для работы с отпусками/больничными
    def add_time_off(self, time_off: TimeOff) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO time_offs (staff_id, start_date, end_date, reason, is_approved)
                VALUES (?, ?, ?, ?, ?)
            ''', (time_off.staff_id, time_off.start_date, time_off.end_date, 
                  time_off.reason, time_off.is_approved))
            time_off_id = cursor.lastrowid
            conn.commit()
            return time_off_id
    
    # Методы для работы с кабинетами
    def add_room(self, room: Room) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO rooms (name, number, equipment, is_active)
                VALUES (?, ?, ?, ?)
            ''', (room.name, room.number, room.equipment, room.is_active))
            room_id = cursor.lastrowid
            conn.commit()
            return room_id
    
    def get_available_rooms(self, date: str, start_time: str, end_time: str) -> List[Room]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT r.* FROM rooms r 
                WHERE r.is_active = 1 
                AND r.id NOT IN (
                    SELECT a.room_id FROM appointments a 
                    WHERE a.appointment_date = ? 
                    AND a.status NOT IN ('отменен', 'завершен')
                    AND (
                        (a.start_time <= ? AND a.end_time >= ?) OR
                        (a.start_time <= ? AND a.end_time >= ?) OR
                        (a.start_time >= ? AND a.end_time <= ?)
                    )
                )
            ''', (date, start_time, start_time, end_time, end_time, start_time, end_time))
            return [self._row_to_room(row) for row in cursor.fetchall()]
    
    # Методы для работы с записями на прием
    def create_appointment(self, appointment: Appointment) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO appointments 
                (client_id, patient_id, doctor_id, assistant_id, room_id, 
                 appointment_date, start_time, end_time, duration, type, 
                 status, reason, notes, equipment_needed, repeat_pattern, repeat_until)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                appointment.client_id, appointment.patient_id, appointment.doctor_id,
                appointment.assistant_id, appointment.room_id, appointment.appointment_date,
                appointment.start_time, appointment.end_time, appointment.duration,
                appointment.type, appointment.status, appointment.reason,
                appointment.notes, appointment.equipment_needed,
                appointment.repeat_pattern, appointment.repeat_until
            ))
            appointment_id = cursor.lastrowid
            conn.commit()
            
            # Обработка повторяющихся записей
            if appointment.repeat_pattern != RepeatPattern.NONE.value:
                self._create_recurring_appointments(appointment, appointment_id)
            
            return appointment_id
    
    def get_available_time_slots(self, doctor_id: int, date: str, 
                               duration: int = 30) -> List[str]:
        """Поиск свободных временных слотов для врача"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Получаем расписание врача на этот день недели
            day_of_week = datetime.strptime(date, '%Y-%m-%d').weekday()
            cursor.execute('''
                SELECT start_time, end_time FROM doctor_schedules 
                WHERE doctor_id = ? AND day_of_week = ? AND is_working = 1
            ''', (doctor_id, day_of_week))
            
            schedule = cursor.fetchone()
            if not schedule:
                return []
            
            start_time = datetime.strptime(schedule[0], '%H:%M').time()
            end_time = datetime.strptime(schedule[1], '%H:%M').time()
            
            # Получаем существующие записи
            cursor.execute('''
                SELECT start_time, end_time FROM appointments 
                WHERE doctor_id = ? AND appointment_date = ? 
                AND status NOT IN ('отменен')
                ORDER BY start_time
            ''', (doctor_id, date))
            
            busy_slots = []
            for row in cursor.fetchall():
                busy_start = datetime.strptime(row[0], '%H:%M').time()
                busy_end = datetime.strptime(row[1], '%H:%M').time()
                busy_slots.append((busy_start, busy_end))
            
            # Генерируем доступные слоты
            return self._generate_time_slots(start_time, end_time, duration, busy_slots)
    
    def _generate_time_slots(self, start_time: time, end_time: time, 
                           duration: int, busy_slots: list) -> List[str]:
        """Генерация доступных временных слотов"""
        slots = []
        current_time = datetime.combine(datetime.today(), start_time)
        end_dt = datetime.combine(datetime.today(), end_time)
        
        while current_time + timedelta(minutes=duration) <= end_dt:
            slot_start = current_time.time()
            slot_end = (current_time + timedelta(minutes=duration)).time()
            
            # Проверяем, не пересекается ли слот с занятыми временами
            is_available = True
            for busy_start, busy_end in busy_slots:
                if (slot_start < busy_end and slot_end > busy_start):
                    is_available = False
                    break
            
            if is_available:
                slots.append(slot_start.strftime('%H:%M'))
            
            current_time += timedelta(minutes=15)  # Шаг в 15 минут
        
        return slots
    
    def _create_recurring_appointments(self, appointment: Appointment, base_id: int):
        """Создание повторяющихся записей"""
        # Реализация создания повторяющихся записей
        pass
    
    # Вспомогательные методы для преобразования строк в объекты
    def _row_to_doctor_schedule(self, row):
        return DoctorSchedule(
            id=row[0], doctor_id=row[1], day_of_week=row[2],
            start_time=datetime.strptime(row[3], '%H:%M').time(),
            end_time=datetime.strptime(row[4], '%H:%M').time(),
            is_working=bool(row[5]), room_id=row[6]
        )
    
    def _row_to_room(self, row):
        return Room(id=row[0], name=row[1], number=row[2], 
                   equipment=row[3], is_active=bool(row[4]))