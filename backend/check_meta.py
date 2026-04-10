from app.models.database import SQLModel, engine
print("Tabelas no Metadata:", SQLModel.metadata.tables.keys())
SQLModel.metadata.create_all(engine)
print("Sucesso ao criar tabelas")
