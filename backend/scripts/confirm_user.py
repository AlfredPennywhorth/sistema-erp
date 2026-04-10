import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env")
    sys.exit(1)

supabase: Client = create_client(url, key)

def confirm_user_email(email: str):
    print(f"--- [SUPABASE ADMIN] Tentando confirmar e-mail: {email} ---")
    
    try:
        # 1. Buscar usuário pelo e-mail
        # Nota: A API de Admin permite buscar usuários
        users_resp = supabase.auth.admin.list_users()
        target_user = next((u for u in users_resp.users if u.email == email), None)
        
        if not target_user:
            print(f"ERRO: Usuário com e-mail '{email}' não encontrado no Supabase.")
            return

        user_id = target_user.id
        print(f"Usuário encontrado! ID: {user_id}")

        # 2. Atualizar email_confirmed_at
        # No supabase-py >= 2.0, usamos auth.admin.update_user_by_id
        update_resp = supabase.auth.admin.update_user_by_id(
            user_id, 
            attributes={"email_confirm": True}
        )
        
        print(f"SUCESSO: E-mail de {email} confirmado com sucesso via Admin API!")
        
    except Exception as e:
        print(f"ERRO CRÍTICO: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/confirm_user.py <email>")
        sys.exit(1)
    
    confirm_user_email(sys.argv[1])
