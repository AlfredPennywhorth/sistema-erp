import os
import httpx
from dotenv import load_dotenv

# Carrega o .env do backend
load_dotenv('backend/.env', override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def reset_password(user_id, new_password):
    url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    data = {"password": new_password}
    
    print(f"Tentando resetar senha para o ID: {user_id}...")
    try:
        response = httpx.put(url, headers=headers, json=data)
        if response.status_code == 200:
            print(f"Sucesso! Senha resetada para o ID: {user_id}")
        else:
            print(f"Erro ({response.status_code}): {response.text}")
    except Exception as e:
        print(f"Erro na requisição: {str(e)}")

# IDs obtidos anteriormente
users_to_reset = {
    "4ea53acc-e231-4c5c-ae77-194204085237": "aws311274@gmail.com",
    "c4394a44-944d-4a75-a975-3f4fb578eac0": "andre.w.souza@outlook.com"
}

NEW_PASSWORD = "Teste@123"

for uid, email in users_to_reset.items():
    print(f"\n--- Processando {email} ---")
    reset_password(uid, NEW_PASSWORD)

print("\nConcluído. Ambas as contas agora usam a senha: " + NEW_PASSWORD)
