import sqlite3
import os

db_path = r'c:\Users\andre\.gemini\antigravity\scratch\sistema-erp\erp.db'
if not os.path.exists(db_path):
    print(f"Erro: Banco não encontrado em {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT email, token, status FROM invite WHERE status = 'PENDING' ORDER BY criado_em DESC LIMIT 1;")
row = cursor.fetchone()
if row:
    print(f"ULTIMO CONVITE PENDENTE:\nEmail: {row[0]}\nToken: {row[1]}\nStatus: {row[2]}")
else:
    print("Nenhum convite pendente encontrado.")
conn.close()
