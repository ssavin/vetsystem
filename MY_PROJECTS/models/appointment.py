from dataclasses import dataclass
from datetime import datetime, time
from typing import Optional, List
from enum import Enum

class AppointmentStatus(Enum):
    PLANNED = "запланирован"
    CONFIRMED = "подтвержден"
    WAITING = "клиент ожидает"
    IN_PROGRESS = "идет прием"
    COMPLETED = "прием завершен"
    NO_SHOW = "неявка"
    CANCELLED = "отменен"

class AppointmentType(Enum):
    PRIMARY = "первичный"
    REPEAT = "повторный"
    CONSULTATION = "консультация"
    PROCEDURE = "процедура"
    OPERATION = "операция"
    VACCINATION = "вакцинация"
    DIAGNOSTICS = "диагностика"
    THERAPY = "терапия"
    GROOMING = "груминг"
    VACCINATION = "вакцинация"
    STERILIZATION = "стерилизация"
    DENTISTRY = "стоматология"
    ULTRASOUND = "УЗИ"
    XRAY = "рентген"

class RepeatPattern(Enum):
    NONE = "без повторения"
    DAILY = "ежедневно"
    WEEKLY = "еженедельно"
    MONTHLY = "ежемесячно"

class ViewMode(Enum):
    DAY = "день"
    WEEK = "неделя"
    MONTH = "месяц"
    LIST = "список"

@dataclass
class TimeSlot:
    start_time: time
    end_time: time
    is_available: bool = True
    appointment: Optional['Appointment'] = None

@dataclass
class DaySchedule:
    date: str
    time_slots: List[TimeSlot]
    appointments: List['Appointment']

@dataclass
class Appointment:
    id: Optional[int] = None
    client_id: int = None
    patient_id: int = None
    doctor_id: int = None
    assistant_id: Optional[int] = None
    room_id: Optional[int] = None
    appointment_date: str = None
    start_time: str = None
    end_time: str = None
    duration: int = 30  # minutes
    type: str = AppointmentType.PRIMARY.value
    status: str = AppointmentStatus.PLANNED.value
    reason: str = ""
    notes: str = ""
    equipment_needed: str = ""
    repeat_pattern: str = RepeatPattern.NONE.value
    repeat_until: Optional[str] = None
    reminder_sent: bool = False
    created_at: str = None
    updated_at: str = None
    
    # For display purposes
    client_name: str = ""
    patient_name: str = ""
    doctor_name: str = ""
    assistant_name: str = ""
    room_name: str = ""
    
    def __post_init__(self):
        # Convert string times to time objects if needed
        if isinstance(self.start_time, str):
            try:
                self.start_time = datetime.strptime(self.start_time, '%H:%M').time()
            except:
                self.start_time = time(9, 0)
        
        if isinstance(self.end_time, str):
            try:
                self.end_time = datetime.strptime(self.end_time, '%H:%M').time()
            except:
                self.end_time = time(9, 30)