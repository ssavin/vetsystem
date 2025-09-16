from models.database import Database
from models.appointment import Appointment, AppointmentStatus, AppointmentType, DoctorSchedule, TimeOff, Room, Staff
from typing import List, Optional, Dict
from datetime import datetime, date, time, timedelta
import logging

logger = logging.getLogger(__name__)

class ScheduleService:
    def __init__(self):
        self.db = Database()
    
    def create_appointment(self, appointment: Appointment) -> Optional[Appointment]:
        try:
            query = """
                INSERT INTO appointments (client_id, patient_id, doctor_id, assistant_id, room_id, 
                                        appointment_date, start_time, end_time, appointment_type, 
                                        status, description, equipment_needed, is_recurring, 
                                        recurrence_pattern, recurrence_end_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at, updated_at
            """
            params = (
                appointment.client_id, appointment.patient_id, appointment.doctor_id,
                appointment.assistant_id, appointment.room_id, appointment.appointment_date,
                appointment.start_time, appointment.end_time, appointment.appointment_type.value,
                appointment.status.value, appointment.description, appointment.equipment_needed,
                appointment.is_recurring, appointment.recurrence_pattern, appointment.recurrence_end_date
            )
            
            result = self.db.execute_query(query, params)
            if result:
                appointment.id = result[0]['id']
                appointment.created_at = result[0]['created_at']
                appointment.updated_at = result[0]['updated_at']
                return appointment
        except Exception as e:
            logger.error(f"Error creating appointment: {e}")
            return None
    
    def update_appointment(self, appointment: Appointment) -> bool:
        try:
            query = """
                UPDATE appointments 
                SET client_id = %s, patient_id = %s, doctor_id = %s, assistant_id = %s, 
                    room_id = %s, appointment_date = %s, start_time = %s, end_time = %s, 
                    appointment_type = %s, status = %s, description = %s, equipment_needed = %s, 
                    is_recurring = %s, recurrence_pattern = %s, recurrence_end_date = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            params = (
                appointment.client_id, appointment.patient_id, appointment.doctor_id,
                appointment.assistant_id, appointment.room_id, appointment.appointment_date,
                appointment.start_time, appointment.end_time, appointment.appointment_type.value,
                appointment.status.value, appointment.description, appointment.equipment_needed,
                appointment.is_recurring, appointment.recurrence_pattern, appointment.recurrence_end_date,
                appointment.id
            )
            
            self.db.execute_query(query, params)
            return True
        except Exception as e:
            logger.error(f"Error updating appointment: {e}")
            return False
    
    def get_appointment_by_id(self, appointment_id: int) -> Optional[Appointment]:
        try:
            query = "SELECT * FROM appointments WHERE id = %s"
            result = self.db.execute_query(query, (appointment_id,))
            
            if result:
                return self._map_to_appointment(result[0])
            return None
        except Exception as e:
            logger.error(f"Error getting appointment: {e}")
            return None
    
    def get_appointments_by_date(self, target_date: date) -> List[Appointment]:
        try:
            query = """
                SELECT a.*, c.first_name as client_first_name, c.last_name as client_last_name,
                       p.name as patient_name, d.first_name as doctor_first_name, d.last_name as doctor_last_name
                FROM appointments a
                LEFT JOIN clients c ON a.client_id = c.id
                LEFT JOIN patients p ON a.patient_id = p.id
                LEFT JOIN staff d ON a.doctor_id = d.id
                WHERE a.appointment_date = %s
                ORDER BY a.start_time
            """
            result = self.db.execute_query(query, (target_date,))
            return [self._map_to_appointment(row) for row in result]
        except Exception as e:
            logger.error(f"Error getting appointments by date: {e}")
            return []
    
    def get_doctor_appointments(self, doctor_id: int, start_date: date, end_date: date) -> List[Appointment]:
        try:
            query = """
                SELECT * FROM appointments 
                WHERE doctor_id = %s AND appointment_date BETWEEN %s AND %s
                ORDER BY appointment_date, start_time
            """
            result = self.db.execute_query(query, (doctor_id, start_date, end_date))
            return [self._map_to_appointment(row) for row in result]
        except Exception as e:
            logger.error(f"Error getting doctor appointments: {e}")
            return []
    
    def find_available_slots(self, doctor_id: int, target_date: date, 
                           duration_minutes: int = 30) -> List[Dict]:
        try:
            # Получаем рабочие часы врача
            doctor_schedule = self.get_doctor_schedule(doctor_id, target_date.weekday())
            if not doctor_schedule or not doctor_schedule.is_working:
                return []
            
            # Получаем существующие записи врача на эту дату
            existing_appointments = self.get_doctor_appointments(doctor_id, target_date, target_date)
            
            # Генерируем доступные слоты
            available_slots = []
            current_time = doctor_schedule.start_time
            end_time = doctor_schedule.end_time
            
            while current_time < end_time:
                slot_end = (datetime.combine(target_date, current_time) + 
                           timedelta(minutes=duration_minutes)).time()
                
                # Проверяем, не попадает ли слот на перерыв
                if (doctor_schedule.break_start and doctor_schedule.break_end and
                    current_time < doctor_schedule.break_end and slot_end > doctor_schedule.break_start):
                    current_time = doctor_schedule.break_end
                    continue
                
                # Проверяем, не пересекается ли слот с существующими записями
                is_available = True
                for app in existing_appointments:
                    if (current_time < app.end_time and slot_end > app.start_time):
                        is_available = False
                        break
                
                if is_available and slot_end <= end_time:
                    available_slots.append({
                        'start_time': current_time,
                        'end_time': slot_end
                    })
                
                current_time = slot_end
            
            return available_slots
            
        except Exception as e:
            logger.error(f"Error finding available slots: {e}")
            return []
    
    def get_doctor_schedule(self, doctor_id: int, day_of_week: int) -> Optional[DoctorSchedule]:
        try:
            query = "SELECT * FROM doctor_schedules WHERE doctor_id = %s AND day_of_week = %s"
            result = self.db.execute_query(query, (doctor_id, day_of_week))
            
            if result:
                return self._map_to_doctor_schedule(result[0])
            return None
        except Exception as e:
            logger.error(f"Error getting doctor schedule: {e}")
            return None
    
    def update_appointment_status(self, appointment_id: int, status: AppointmentStatus) -> bool:
        try:
            query = "UPDATE appointments SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s"
            self.db.execute_query(query, (status.value, appointment_id))
            return True
        except Exception as e:
            logger.error(f"Error updating appointment status: {e}")
            return False
    
    def _map_to_appointment(self, row) -> Appointment:
        return Appointment(
            id=row['id'],
            client_id=row['client_id'],
            patient_id=row['patient_id'],
            doctor_id=row['doctor_id'],
            assistant_id=row['assistant_id'],
            room_id=row['room_id'],
            appointment_date=row['appointment_date'],
            start_time=row['start_time'],
            end_time=row['end_time'],
            appointment_type=AppointmentType(row['appointment_type']),
            status=AppointmentStatus(row['status']),
            description=row['description'],
            equipment_needed=row['equipment_needed'],
            is_recurring=row['is_recurring'],
            recurrence_pattern=row['recurrence_pattern'],
            recurrence_end_date=row['recurrence_end_date'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    def _map_to_doctor_schedule(self, row) -> DoctorSchedule:
        return DoctorSchedule(
            id=row['id'],
            doctor_id=row['doctor_id'],
            day_of_week=row['day_of_week'],
            start_time=row['start_time'],
            end_time=row['end_time'],
            is_working=row['is_working'],
            break_start=row['break_start'],
            break_end=row['break_end']
        )