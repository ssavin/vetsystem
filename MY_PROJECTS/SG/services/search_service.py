from models.database import Database
from models.client import Client
from models.patient import Patient
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self):
        self.db = Database()
    
    def search_clients(self, search_term: str) -> List[Client]:
        try:
            query = """
                SELECT * FROM clients 
                WHERE last_name ILIKE %s OR first_name ILIKE %s 
                   OR phone ILIKE %s OR email ILIKE %s
                ORDER BY last_name, first_name
            """
            search_pattern = f"%{search_term}%"
            result = self.db.execute_query(query, (search_pattern, search_pattern, search_pattern, search_pattern))
            return [self._map_to_client(row) for row in result]
        except Exception as e:
            logger.error(f"Error searching clients: {e}")
            return []
    
    def search_patients(self, search_term: str) -> List[Patient]:
        try:
            query = """
                SELECT * FROM patients 
                WHERE name ILIKE %s OR chip_number ILIKE %s 
                   OR species ILIKE %s OR breed ILIKE %s
                ORDER BY name
            """
            search_pattern = f"%{search_term}%"
            result = self.db.execute_query(query, (search_pattern, search_pattern, search_pattern, search_pattern))
            return [self._map_to_patient(row) for row in result]
        except Exception as e:
            logger.error(f"Error searching patients: {e}")
            return []
    
    def search_clients_by_phone(self, phone: str) -> List[Client]:
        try:
            query = "SELECT * FROM clients WHERE phone ILIKE %s ORDER BY last_name, first_name"
            result = self.db.execute_query(query, (f"%{phone}%",))
            return [self._map_to_client(row) for row in result]
        except Exception as e:
            logger.error(f"Error searching clients by phone: {e}")
            return []
    
    def _map_to_client(self, row) -> Client:
        return Client(
            id=row['id'],
            last_name=row['last_name'],
            first_name=row['first_name'],
            middle_name=row['middle_name'],
            phone=row['phone'],
            email=row['email'],
            address=row['address'],
            status=row['status'],
            notes=row['notes'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    def _map_to_patient(self, row) -> Patient:
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