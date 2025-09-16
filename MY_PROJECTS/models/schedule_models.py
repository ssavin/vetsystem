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

class RepeatPattern(Enum):
    NONE = "без повторения"
    DAILY = "ежедневно"
    WEEKLY = "еженедельно"
    MONTHLY = "ежемесячно"

@dataclass
class DoctorSchedule:
    id: Optional[int] = None
    doctor_id: int = None
    day_of_week: int = None  # 0-6 (понедельник-воскресенье)
    start_time: time = None
    end_time: time = None
    is_working: bool = True
    room_id: Optional[int] = None

@dataclass
class TimeOff:
    id: Optional[int] = None
    staff_id: int = None
    start_date: str = None
    end_date: str = None
    reason: str = ""
    is_approved: bool = False

@dataclass
class Room:
    id: Optional[int] = None
    name: str = ""
    number: str = ""
    equipment: str = ""
    is_active: bool = True

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