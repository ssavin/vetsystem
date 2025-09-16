from models.database import Database
import os
from dotenv import load_dotenv

load_dotenv()

def init_database():
    # Подключение к базе данных postgres для создания БД
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database='postgres',
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'vetais'),
        port=os.getenv('DB_PORT', '5432')
    )
    conn.autocommit = True
    
    # Создание базы данных если не существует
    with conn.cursor() as cursor:
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'vetsystem'")
        exists = cursor.fetchone()
        if not exists:
            cursor.execute("CREATE DATABASE vetsystem")
            print("База данных создана")
    
    conn.close()
    
    # Создание таблиц
    db = Database()
    with open('database/schema.sql', 'r', encoding='utf-8') as f:
        schema = f.read()
    
    try:
        db.execute_query(schema)
        print("Таблицы созданы успешно")
    except Exception as e:
        print(f"Ошибка при создании таблиц: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()