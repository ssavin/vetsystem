from models.database import Database
from models.client import Client
from models.patient import Patient
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class ClientService:
    def __init__(self):
        self.db = Database()
    
    def create_client(self, client: Client) -> Optional[Client]:
        try:
            query = """
                INSERT INTO clients (last_name, first_name, middle_name, phone, email, address, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at, updated_at
            """
            params = (
                client.last_name, client.first_name, client.middle_name,
                client.phone, client.email, client.address,
                client.status, client.notes
            )
            
            result = self.db.execute_query(query, params)
            if result:
                client.id = result[0]['id']
                client.created_at = result[0]['created_at']
                client.updated_at = result[0]['updated_at']
                return client
        except Exception as e:
            logger.error(f"Error creating client: {e}")
            return None
    
    def update_client(self, client: Client) -> bool:
        try:
            query = """
                UPDATE clients 
                SET last_name = %s, first_name = %s, middle_name = %s, 
                    phone = %s, email = %s, address = %s, 
                    status = %s, notes = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            params = (
                client.last_name, client.first_name, client.middle_name,
                client.phone, client.email, client.address,
                client.status, client.notes, client.id
            )
            
            self.db.execute_query(query, params)
            return True
        except Exception as e:
            logger.error(f"Error updating client: {e}")
            return False
    
    def get_client_by_id(self, client_id: int) -> Optional[Client]:
        try:
            query = "SELECT * FROM clients WHERE id = %s"
            result = self.db.execute_query(query, (client_id,))
            
            if result:
                return self._map_to_client(result[0])
            return None
        except Exception as e:
            logger.error(f"Error getting client: {e}")
            return None
    
    def get_all_clients(self) -> List[Client]:
        """
        Получить всех клиентов
        """
        try:
            query = "SELECT * FROM clients ORDER BY last_name, first_name"
            result = self.db.execute_query(query)
            return [self._map_to_client(row) for row in result]
        except Exception as e:
            logger.error(f"Error getting clients: {e}")
            return []
    
    def add_client_note(self, client_id: int, note: str, note_type: str = "общая", created_by: str = "system"):
        try:
            query = """
                INSERT INTO client_notes (client_id, note, note_type, created_by)
                VALUES (%s, %s, %s, %s)
            """
            params = (client_id, note, note_type, created_by)
            self.db.execute_query(query, params)
            return True
        except Exception as e:
            logger.error(f"Error adding client note: {e}")
            return False
    
    def search_clients(self, search_term: str) -> List[Client]:
        """
        Поиск клиентов по различным параметрам
        """
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