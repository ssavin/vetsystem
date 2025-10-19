#!/bin/bash
# Скрипт для конвертации COPY backup в INSERT формат

echo "=== Конвертер COPY → INSERT ==="
echo "Это займет продолжительное время для большой базы данных"
echo ""

# Проверка аргументов
if [ $# -ne 2 ]; then
    echo "Использование: $0 <исходный_backup.sql> <выходной_backup.sql>"
    echo "Пример: $0 backup_20251019_115113.sql backup_inserts.sql"
    exit 1
fi

INPUT_FILE=$1
OUTPUT_FILE=$2

# Проверка существования файла
if [ ! -f "$INPUT_FILE" ]; then
    echo "Ошибка: файл $INPUT_FILE не найден"
    exit 1
fi

echo "Исходный файл: $INPUT_FILE"
echo "Выходной файл: $OUTPUT_FILE"
echo ""

# Если файл сжат, распаковать
if [[ $INPUT_FILE == *.gz ]]; then
    echo "Распаковка файла..."
    TEMP_FILE="${INPUT_FILE%.gz}"
    gunzip -c "$INPUT_FILE" > "$TEMP_FILE"
    INPUT_FILE="$TEMP_FILE"
fi

echo "Конвертация COPY в INSERT..."
echo "Это может занять несколько минут..."
echo ""

# Используем pg_dump с подключением к восстановленной БД для создания INSERT
# Более надежный способ - использовать custom формат

cat << 'PYTHON_SCRIPT' > /tmp/copy_to_insert.py
#!/usr/bin/env python3
import sys
import re

def convert_copy_to_insert(input_file, output_file):
    """
    Конвертирует COPY команды в INSERT
    """
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8') as outfile:
        
        current_table = None
        columns = []
        in_copy = False
        
        for line in infile:
            # Найти COPY команду
            copy_match = re.match(r'COPY (\S+\.\S+|\S+) \((.*?)\) FROM stdin;', line)
            if copy_match:
                current_table = copy_match.group(1)
                columns = [col.strip() for col in copy_match.group(2).split(',')]
                in_copy = True
                print(f"Обработка таблицы: {current_table}", file=sys.stderr)
                continue
            
            # Конец COPY блока
            if in_copy and line.strip() == '\\.':
                in_copy = False
                current_table = None
                columns = []
                continue
            
            # Конвертировать данные COPY в INSERT
            if in_copy and current_table:
                if line.strip() and not line.startswith('--'):
                    values = line.strip().split('\t')
                    # Экранировать значения
                    escaped_values = []
                    for val in values:
                        if val == '\\N':
                            escaped_values.append('NULL')
                        else:
                            # Простое экранирование
                            val = val.replace("'", "''")
                            escaped_values.append(f"'{val}'")
                    
                    insert_stmt = f"INSERT INTO {current_table} ({', '.join(columns)}) VALUES ({', '.join(escaped_values)});\n"
                    outfile.write(insert_stmt)
            else:
                # Копировать остальные строки как есть
                outfile.write(line)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: copy_to_insert.py <input> <output>")
        sys.exit(1)
    
    convert_copy_to_insert(sys.argv[1], sys.argv[2])
    print("\nГотово!", file=sys.stderr)

PYTHON_SCRIPT

chmod +x /tmp/copy_to_insert.py
python3 /tmp/copy_to_insert.py "$INPUT_FILE" "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Конвертация завершена успешно!"
    echo "Размер исходного файла: $(du -h "$INPUT_FILE" | cut -f1)"
    echo "Размер выходного файла: $(du -h "$OUTPUT_FILE" | cut -f1)"
    echo ""
    echo "Восстановление:"
    echo "  psql -h HOST -U USER -d DATABASE < $OUTPUT_FILE"
else
    echo "✗ Ошибка при конвертации"
    exit 1
fi
