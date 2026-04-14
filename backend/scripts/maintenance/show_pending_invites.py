import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")
if "sslmode=require" not in DATABASE_URL:
    DATABASE_URL += ("&" if "?" in DATABASE_URL else "?") + "sslmode=require"

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute("SELECT token, email, role::text, status::text, expira_em FROM convites WHERE status = 'PENDING' ORDER BY criado_em DESC LIMIT 3;")
for row in cur.fetchall():
    print(f"Email: {row[1]}")
    print(f"Role: {row[2]}")
    print(f"Status: {row[3]}")
    print(f"Expira em: {row[4]}")
    print(f"Link: http://localhost:5173/finalizar-registro?token={row[0]}")
    print("---")
cur.close()
conn.close()
