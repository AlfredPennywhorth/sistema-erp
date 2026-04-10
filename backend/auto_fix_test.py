import sqlite3
import requests

db = sqlite3.connect('erp.db')
c = db.cursor()
c.execute("SELECT token FROM convites WHERE status = 'PENDENTE' LIMIT 1")
res = c.fetchone()
if not res:
    print("ERRO: NENHUM CONVITE PENDENTE")
    exit(1)

token = res[0]
print(f"Testando com token: {token}")

url = "http://localhost:8000/api/v1/team/finalize-registration"
payload = {
    "token": token,
    "nome": "Colaborador Sucesso",
    "usuario_id": "475fe8a7-278c-425c-bac2-8337d817b38a"
}

resp = requests.post(url, json=payload)
print(f"Status: {resp.status_code}")
print(f"Body: {resp.text}")
db.close()
