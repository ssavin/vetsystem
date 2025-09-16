import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from models.database import Database
from models.client import Client

# Настройка логирования
logger = logging.getLogger(__name__)

class ClientService:
    """
    Сервис для работы с клиентами ветеринарной клиники.
    Обеспечивает CRUD операции и бизнес-логику для клиентов.
    """
    
    def __init__(self):
        """Инициализация сервиса с подключением к базе данных."""
        self.db = Database()
        logger.info("ClientService инициализирован")
    
    def create_client(self, client: Client) -> Optional[Client]:
        """
        Создание нового клиента в базе данных.
        
        Args:
            client (Client): Объект клиента для создания
            
        Returns:
            Optional[Client]: Созданный клиент с ID или None в случае ошибки
        """
        try:
            query = """
                INSERT INTO clients (last_name, first_name, middle_name, 
                                   phone, email, address, status, notes)
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
                logger.info(f"Клиент создан: ID {client.id}, {client.full_name}")
                return client
            else:
                logger.warning("Не удалось создать клиента: нет результата от БД")
                return None
                
        except Exception as e:
            logger.error(f"Ошибка создания клиента: {e}")
            return None
    
    def update_client(self, client: Client) -> bool:
        """
        Обновление данных клиента в базе данных.
        
        Args:
            client (Client): Объект клиента с обновленными данными
            
        Returns:
            bool: True если успешно, False в случае ошибки
        """
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
            logger.info(f"Клиент обновлен: ID {client.id}")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка обновления клиента ID {client.id}: {e}")
            return False
    
    def get_client_by_id(self, client_id: int) -> Optional[Client]:
        """
        Получение клиента по ID.
        
        Args:
            client_id (int): ID клиента
            
        Returns:
            Optional[Client]: Объект клиента или None если не найден
        """
        try:
            query = "SELECT * FROM clients WHERE id = %s"
            result = self.db.execute_query(query, (client_id,))
            
            if result:
                client = self._map_to_client(result[0])
                logger.debug(f"Клиент найден: ID {client_id}")
                return client
            else:
                logger.warning(f"Клиент не найден: ID {client_id}")
                return None
                
        except Exception as e:
            logger.error(f"Ошибка получения клиента ID {client_id}: {e}")
            return None
    
    def get_all_clients(self) -> List[Client]:
        """
        Получение всех клиентов из базы данных.
        
        Returns:
            List[Client]: Список всех клиентов
        """
        try:
            query = """
                SELECT * FROM clients 
                ORDER BY last_name, first_name, middle_name
            """
            result = self.db.execute_query(query)
            clients = [self._map_to_client(row) for row in result]
            logger.info(f"Загружено клиентов: {len(clients)}")
            return clients
            
        except Exception as e:
            logger.error(f"Ошибка получения всех клиентов: {e}")
            return []
    
    def search_clients(self, search_term: str) -> List[Client]:
        """
        Поиск клиентов по различным параметрам.
        
        Args:
            search_term (str): Строка для поиска
            
        Returns:
            List[Client]: Список найденных клиентов
        """
        try:
            query = """
                SELECT * FROM clients 
                WHERE last_name ILIKE %s OR first_name ILIKE %s 
                   OR phone ILIKE %s OR email ILIKE %s
                   OR address ILIKE %s
                ORDER BY last_name, first_name
            """
            search_pattern = f"%{search_term}%"
            params = (search_pattern, search_pattern, search_pattern, 
                     search_pattern, search_pattern)
            
            result = self.db.execute_query(query, params)
            clients = [self._map_to_client(row) for row in result]
            logger.info(f"Найдено клиентов по запросу '{search_term}': {len(clients)}")
            return clients
            
        except Exception as e:
            logger.error(f"Ошибка поиска клиентов: {e}")
            return []
    
    def get_clients_by_status(self, status: str) -> List[Client]:
        """
        Получение клиентов по статусу.
        
        Args:
            status (str): Статус клиента
            
        Returns:
            List[Client]: Список клиентов с указанным статусом
        """
        try:
            query = "SELECT * FROM clients WHERE status = %s ORDER BY last_name, first_name"
            result = self.db.execute_query(query, (status,))
            clients = [self._map_to_client(row) for row in result]
            logger.info(f"Найдено клиентов со статусом '{status}': {len(clients)}")
            return clients
            
        except Exception as e:
            logger.error(f"Ошибка получения клиентов по статусу '{status}': {e}")
            return []
    
    def delete_client(self, client_id: int) -> bool:
        """
        Удаление клиента из базы данных.
        
        Args:
            client_id (int): ID клиента для удаления
            
        Returns:
            bool: True если успешно, False в случае ошибки
        """
        try:
            # Сначала проверяем, есть ли у клиента питомцы
            query_check = "SELECT COUNT(*) FROM client_patient WHERE client_id = %s"
            result = self.db.execute_query(query_check, (client_id,))
            
            if result and result[0]['count'] > 0:
                logger.warning(f"Нельзя удалить клиента ID {client_id}: есть привязанные питомцы")
                return False
            
            query = "DELETE FROM clients WHERE id = %s"
            self.db.execute_query(query, (client_id,))
            logger.info(f"Клиент удален: ID {client_id}")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка удаления клиента ID {client_id}: {e}")
            return False
    
    def add_client_note(self, client_id: int, note: str, 
                       note_type: str = "общая", created_by: str = "system") -> bool:
        """
        Добавление заметки к клиенту.
        
        Args:
            client_id (int): ID клиента
            note (str): Текст заметки
            note_type (str): Тип заметки
            created_by (str): Кто создал заметку
            
        Returns:
            bool: True если успешно, False в случае ошибки
        """
        try:
            query = """
                INSERT INTO client_notes (client_id, note, note_type, created_by)
                VALUES (%s, %s, %s, %s)
            """
            params = (client_id, note, note_type, created_by)
            self.db.execute_query(query, params)
            logger.info(f"Добавлена заметка для клиента ID {client_id}")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка добавления заметки для клиента ID {client_id}: {e}")
            return False
    
    def get_client_notes(self, client_id: int) -> List[Dict[str, Any]]:
        """
        Получение всех заметок клиента.
        
        Args:
            client_id (int): ID клиента
            
        Returns:
            List[Dict]: Список заметок клиента
        """
        try:
            query = """
                SELECT * FROM client_notes 
                WHERE client_id = %s 
                ORDER BY created_at DESC
            """
            result = self.db.execute_query(query, (client_id,))
            return result
            
        except Exception as e:
            logger.error(f"Ошибка получения заметок клиента ID {client_id}: {e}")
            return []
    
    def update_client_status(self, client_id: int, status: str) -> bool:
        """
        Обновление статуса клиента.
        
        Args:
            client_id (int): ID клиента
            status (str): Новый статус
            
        Returns:
            bool: True если успешно, False в случае ошибки
        """
        try:
            query = "UPDATE clients SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s"
            self.db.execute_query(query, (status, client_id))
            logger.info(f"Статус клиента ID {client_id} изменен на '{status}'")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка изменения статуса клиента ID {client_id}: {e}")
            return False
    
    def get_client_stats(self) -> Dict[str, int]:
        """
        Получение статистики по клиентам.
        
        Returns:
            Dict: Статистика по статусам клиентов
        """
        try:
            query = """
                SELECT status, COUNT(*) as count 
                FROM clients 
                GROUP BY status
            """
            result = self.db.execute_query(query)
            
            stats = {}
            for row in result:
                stats[row['status']] = row['count']
            
            logger.info("Статистика клиентов получена")
            return stats
            
        except Exception as e:
            logger.error(f"Ошибка получения статистики клиентов: {e}")
            return {}
    
    def _map_to_client(self, row) -> Client:
        """
        Преобразование строки из базы данных в объект Client.
        
        Args:
            row: Строка результата запроса
            
        Returns:
            Client: Объект клиента
        """
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
    
    def close_connection(self):
        """Закрытие соединения с базой данных."""
        if hasattr(self, 'db'):
            self.db.close()
            logger.info("Соединение с базой данных закрыто")

# Создание глобального экземпляра сервиса для импорта
client_service = ClientService()

# Пример использования:
if __name__ == "__main__":
    # Тестирование сервиса
    service = ClientService()
    
    # Получение всех клиентов
    clients = service.get_all_clients()
    print(f"Найдено клиентов: {len(clients)}")
    
    # Поиск клиентов
    search_results = service.search_clients("Иван")
    print(f"Найдено по поиску: {len(search_results)}")
    
    service.close_connection()