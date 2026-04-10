import urllib.request
import urllib.error
import json

# Usa o token pendente para andre.w.souza@outlook.com
TOKEN = "e78c2b8b-a581-4e15-81a2-34742e0ebaef"

# Passo 1: buscar detalhes do convite
print("=== Passo 1: Detalhes do Convite ===")
try:
    req = urllib.request.Request(f"http://localhost:8000/api/v1/team/invite-details/{TOKEN}")
    with urllib.request.urlopen(req, timeout=10) as r:
        details = json.loads(r.read())
        print(f"OK: {details}")
except urllib.error.HTTPError as e:
    print(f"ERRO HTTP {e.code}: {e.read().decode()}")
    exit(1)

# Passo 2: finalizar registro (Mock UUID)
import uuid
mock_user_id = str(uuid.uuid4())
print(f"\n=== Passo 2: Finalizar Registro (Mock UUID: {mock_user_id[:8]}...) ===")
payload = json.dumps({
    "token": TOKEN,
    "nome": "André W. de Souza",
    "usuario_id": mock_user_id
}).encode("utf-8")

req2 = urllib.request.Request(
    "http://localhost:8000/api/v1/team/finalize-registration",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)
try:
    with urllib.request.urlopen(req2, timeout=15) as r:
        resp = json.loads(r.read())
        print(f"SUCESSO: {resp}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"ERRO HTTP {e.code}: {body}")
