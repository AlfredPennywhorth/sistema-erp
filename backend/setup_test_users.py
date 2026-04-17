import os
import httpx
from dotenv import load_dotenv

load_dotenv('backend/.env', override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_auth_client():
    return httpx.Client(headers={
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    })

def create_or_update_user(user_id, email, password):
    client = get_auth_client()
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    
    # Primeiro tenta criar
    data = {
        "id": user_id,
        "email": email,
        "password": password,
        "email_confirm": True
    }
    
    print(f"Processando {email}...")
    resp = client.post(url, json=data)
    
    if resp.status_code == 201:
        print(f"User {email} criado com sucesso.")
    elif resp.status_code == 422 and ("already exists" in resp.text or "already been registered" in resp.text):
        # Se já existe, atualiza a senha
        update_url = f"{url}/{user_id}"
        resp = client.put(update_url, json={"password": password})
        if resp.status_code == 200:
            print(f"User {email} já existia. Senha atualizada.")
        else:
            print(f"Erro ao atualizar {email}: {resp.text}")
    else:
        print(f"Erro ao processar {email}: {resp.text}")

# Dados baseados na tabela 'usuarios'
users = [
    {"id": "4ea53acc-e231-4c5c-ae77-194204085237", "email": "aws311274@gmail.com"},
    {"id": "c4394a44-944d-4a75-a975-3f4fb578eac0", "email": "andre.w.souza@outlook.com"}
]

PASSWORD = os.getenv("TEST_USER_PASSWORD")
if not PASSWORD:
    print("ERRO: Variável TEST_USER_PASSWORD não configurada no ambiente.")
    exit(1)

for u in users:
    create_or_update_user(u["id"], u["email"], PASSWORD)

print(f"\nFinalizado. Ambas as contas usam a senha: {PASSWORD}")
