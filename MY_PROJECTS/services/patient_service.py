from models.database import Database
from models.patient import Patient
from models.client import Client
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class PatientService:
    def __init__(self):
        self.db = Database()
    
    def create_patient(self, patient: Patient) -> Optional[Patient]:
        try:
            query = """
                INSERT INTO patients (name, species, breed, gender, birth_date, age, 
                                    color, special_marks, chip_number, is_neutered, 
                                    allergies, chronic_diseases, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at, updated_at
            """
            params = (
                patient.name, patient.species, patient.breed, patient.gender,
                patient.birth_date, patient.age, patient.color, patient.special_marks,
                patient.chip_number, patient.is_neutered, patient.allergies,
                patient.chronic_diseases, patient.status, patient.notes
            )
            
            result = self.db.execute_query(query, params)
            if result:
                patient.id = result[0]['id']
                patient.created_at = result[0]['created_at']
                patient.updated_at = result[0]['updated_at']
                return patient
        except Exception as e:
            logger.error(f"Error creating patient: {e}")
            return None
    
    def update_patient(self, patient: Patient) -> bool:
        try:
            query = """
                UPDATE patients 
                SET name = %s, species = %s, breed = %s, gender = %s, 
                    birth_date = %s, age = %s, color = %s, special_marks = %s, 
                    chip_number = %s, is_neutered = %s, allergies = %s, 
                    chronic_diseases = %s, status = %s, notes = %s, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            params = (
                patient.name, patient.species, patient.breed, patient.gender,
                patient.birth_date, patient.age, patient.color, patient.special_marks,
                patient.chip_number, patient.is_neutered, patient.allergies,
                patient.chronic_diseases, patient.status, patient.notes, patient.id
            )
            
            self.db.execute_query(query, params)
            return True
        except Exception as e:
            logger.error(f"Error updating patient: {e}")
            return False
    
    def get_patient_by_id(self, patient_id: int) -> Optional[Patient]:
        try:
            query = "SELECT * FROM patients WHERE id = %s"
            result = self.db.execute_query(query, (patient_id,))
            
            if result:
                return self._map_to_patient(result[0])
            return None
        except Exception as e:
            logger.error(f"Error getting patient: {e}")
            return None
    
    def get_all_patients(self) -> List[Patient]:
        """
        Получить всех пациентов
        Возвращает список всех пациентов
        """
        try:
            query = "SELECT * FROM patients ORDER BY name"
            result = self.db.execute_query(query)
            return [self._map_to_patient(row) for row in result]
        except Exception as e:
            logger.error(f"Error getting all patients: {e}")
            return []
    
    def link_client_patient(self, client_id: int, patient_id: int, 
                           relationship_type: str = "владелец", is_primary: bool = True) -> bool:
        try:
            query = """
                INSERT INTO client_patient (client_id, patient_id, relationship_type, is_primary)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (client_id, patient_id) DO UPDATE 
                SET relationship_type = EXCLUDED.relationship_type,
                    is_primary = EXCLUDED.is_primary
            """
            params = (client_id, patient_id, relationship_type, is_primary)
            self.db.execute_query(query, params)
            return True
        except Exception as e:
            logger.error(f"Error linking client and patient: {e}")
            return False
    
    def get_patients_by_client(self, client_id: int) -> List[Patient]:
        try:
            query = """
                SELECT p.* FROM patients p
                JOIN client_patient cp ON p.id = cp.patient_id
                WHERE cp.client_id = %s
                ORDER BY p.name
            """
            result = self.db.execute_query(query, (client_id,))
            return [self._map_to_patient(row) for row in result]
        except Exception as e:
            logger.error(f"Error getting patients by client: {e}")
            return []
    
    def search_patients(self, search_term: str) -> List[Patient]:
        """
        Поиск пациентов по различным параметрам
        """
        try:
            query = """
                SELECT * FROM patients 
                WHERE name ILIKE %s OR species ILIKE %s 
                   OR breed ILIKE %s OR chip_number ILIKE %s
                ORDER BY name
            """
            search_pattern = f"%{search_term}%"
            result = self.db.execute_query(query, (search_pattern, search_pattern, search_pattern, search_pattern))
            return [self._map_to_patient(row) for row in result]
        except Exception as e:
            logger.error(f"Error searching patients: {e}")
            return []
    
    def _map_to_patient(self, row) -> Patient:
        """
        Преобразование результата запроса в объект Patient
        """
        return Patient(
            id=row['id'],
            name=row['name'],
            species=row['species'],
            breed=row['breed'],
            gender=row['gender'],
            birth_date=row['birth_date'],
            age=row['age'],
            color=row['color'],
            special_marks=row['special_marks'],
            chip_number=row['chip_number'],
            is_neutered=row['is_neutered'],
            allergies=row['allergies'],
            chronic_diseases=row['chronic_diseases'],
            status=row['status'],
            notes=row['notes'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )