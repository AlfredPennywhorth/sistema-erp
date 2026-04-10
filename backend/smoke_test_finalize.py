import requests
import json

url = "http://localhost:8000/api/v1/team/finalize-registration"
payload = {
    "token": "e04981e5-23f1-4a2e-84c0-1103fff9f09c0",
    "nome": "Colaborador Teste Nexus",
    "usuario_id": "475fe8a7-278c-425c-bac2-8337d817b38a"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Erro ao conectar ao backend: {e}")
