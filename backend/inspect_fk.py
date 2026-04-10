from app.models.database import SQLModel, engine
import sqlalchemy

print("Inspecionando Foreign Keys de 'empresas'...")
table = SQLModel.metadata.tables.get('empresas')
if table is not None:
    for fk in table.foreign_keys:
        print(f"FK: {fk}")
        print(f"  Target: {fk.target_fullname}")
else:
    print("Tabela 'empresas' não encontrada no metadata!")

print("\nTabelas no metadata:")
print(list(SQLModel.metadata.tables.keys()))
