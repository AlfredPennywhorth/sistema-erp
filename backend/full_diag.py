import sqlite3
import uuid

conn = sqlite3.connect('erp.db')
cursor = conn.cursor()

print("--- CONVITES ---")
cursor.execute("SELECT email, status, token FROM convites")
for row in cursor.fetchall():
    print(f"Email: {row[0]} | Status: {row[1]} | Token: {row[2]}")

print("\n--- USUÁRIOS NO BANCO LOCAL ---")
cursor.execute("SELECT id, email, nome FROM usuarios")
for row in cursor.fetchall():
    print(f"ID: {row[0]} | Email: {row[1]} | Nome: {row[2]}")

print("\n--- VINCULOS USUARIO-EMPRESA ---")
cursor.execute("SELECT usuario_id, empresa_id, role FROM usuario_empresas")
for row in cursor.fetchall():
    print(f"User: {row[0]} | Empresa: {row[1]} | Role: {row[2]}")

conn.close()
