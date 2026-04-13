import os
import httpx
from datetime import datetime
from dotenv import load_dotenv

load_dotenv('backend/.env', override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def confirm_user_email(user_email):
    # Primeiro busca o ID do usuário pelo email
    list_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    print(f"Buscando usuário: {user_email}...")
    r = httpx.get(list_url, headers=headers)
    users = r.json().get('users', [])
    user = next((u for u in users if u.get('email') == user_email), None)
    
    if not user:
        print(f"Erro: Usuário {user_email} não encontrado.")
        return

    user_id = user['id']
    update_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    
    # Confirma o e-mail e garante que a senha seja a correta
    data = {
        "email_confirm": True,
        "password": "Teste@123"
    }
    
    print(f"Confirmando e-mail para o ID: {user_id}...")
    r = httpx.put(update_url, headers=headers, json=data)
    
    if r.status_code == 200:
        print(f"Sucesso! E-mail de {user_email} confirmado.")
    else:
        print(f"Erro ao confirmar e-mail: {r.text}")

# Lista de e-mails para confirmar
emails = ["aws311274@gmail.com", "andre.w.souza@outlook.com"]

for email in emails:
    confirm_user_email(email)
