import os
import sys

# Adiciona o diretório atual ao path para importar a app
sys.path.append(os.getcwd())

from app.models.database import engine, SQLModel
from sqlalchemy import inspect

print("Diagnóstico de Banco de Dados")
print(f"Database URL: {engine.url}")

print("\nMetadados - Tabelas registradas:")
for table_name in SQLModel.metadata.tables.keys():
    print(f" - {table_name}")

print("\nTentando ordenar tabelas por dependência...")
try:
    sorted_tables = SQLModel.metadata.sorted_tables
    print("Ordenação concluída com sucesso!")
    for table in sorted_tables:
        print(f" - {table.name}")
except Exception as e:
    print(f"ERRO ao ordenar tabelas: {e}")
    import traceback
    traceback.print_exc()

print("\nTentando criar tabelas uma a uma...")
for name, table in SQLModel.metadata.tables.items():
    try:
        print(f"Criando {name}...", end=" ")
        table.create(engine, checkfirst=True)
        print("OK")
    except Exception as e:
        print(f"FALHOU: {e}")

print("\nConcluído.")
