import os
import sys
import asyncio
from dotenv import load_dotenv
import httpx

# Carregar variáveis de ambiente do diretório backend
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def reset_user_password(email: str, new_password: str):
    if not SERVICE_ROLE_KEY or not SUPABASE_URL:
        print("ERRO: SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_URL não configurados no .env")
        return False

    headers = {
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "apikey": SERVICE_ROLE_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            # 1. Buscar o ID do usuário pelo email
            print(f"Buscando ID do usuário para {email}...")
            list_res = await client.get(f"{SUPABASE_URL}/auth/v1/admin/users", headers=headers)
            
            if list_res.status_code != 200:
                print(f"Erro ao listar usuários: {list_res.status_code} - {list_res.text}")
                return False
                
            users = list_res.json().get("users", [])
            user_id = next((u["id"] for u in users if u["email"] == email), None)
            
            if not user_id:
                print(f"Usuário com e-mail {email} não encontrado no Supabase Auth.")
                return False
                
            print(f"Usuário encontrado! ID: {user_id}")
            
            # 2. Resetar a senha
            print(f"Redefinindo senha para o usuário {user_id}...")
            update_res = await client.put(
                f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                headers=headers,
                json={"password": new_password}
            )
            
            if update_res.status_code == 200:
                print(f"✅ SUCESSO: Senha redefinida para {email}")
                return True
            else:
                print(f"❌ Erro ao redefinir senha: {update_res.status_code} - {update_res.text}")
                return False
                
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {str(e)}")
        return False

if __name__ == "__main__":
    email_to_reset = "aws311274@gmail.com"
    new_pass = "@Aws2026!"
    asyncio.run(reset_user_password(email_to_reset, new_pass))
