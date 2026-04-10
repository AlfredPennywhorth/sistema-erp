import os
import psycopg2
from dotenv import load_dotenv
import urllib.request
import json

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
conn_url = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
if "sslmode=require" not in conn_url:
    sep = "&" if "?" in conn_url else "?"
    conn_url += f"{sep}sslmode=require"

# Buscar um token de convite válido do banco
try:
    conn = psycopg2.connect(conn_url)
    cur = conn.cursor()
    cur.execute("SELECT token, email, role::text, status::text FROM convites ORDER BY criado_em DESC LIMIT 5;")
    invites = cur.fetchall()
    cur.close()
    conn.close()
    
    print("=== CONVITES NO BANCO ===")
    for inv in invites:
        print(f"Token: {inv[0][:16]}... | Email: {inv[1]} | Role: {inv[2]} | Status: {inv[3]}")
    
    if invites:
        token = invites[0][0]
        print(f"\nTestando endpoint com token: {token[:16]}...")
        
        url = f"http://localhost:8000/api/v1/team/invite-details/{token}"
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
                print(f"SUCESSO: {data}")
        except Exception as e:
            print(f"ERRO na chamada HTTP: {e}")
    else:
        print("Nenhum convite encontrado no banco.")
        
except Exception as e:
    print(f"ERRO ao conectar ao banco: {e}")
