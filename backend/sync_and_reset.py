import os
import httpx
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv('backend/.env', override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DATABASE_URL = os.getenv("DATABASE_URL").replace("postgres://", "postgresql://")

def get_auth_users():
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}"
    }
    r = httpx.get(url, headers=headers)
    return r.json().get('users', [])

def update_db_user_id(old_email, new_uuid):
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Pega o ID atual no DB
        res = conn.execute(text("SELECT id FROM usuarios WHERE email = :email"), {"email": old_email}).fetchone()
        if not res:
            print(f"User {old_email} não encontrado no banco local.")
            return
        
        db_uuid = str(res[0])
        if db_uuid == new_uuid:
            print(f"ID para {old_email} já está sincronizado.")
            return

        print(f"Sincronizando ID para {old_email}: {db_uuid} -> {new_uuid}")
        
        # Como o ID é PK e tem FKs, precisamos atualizar em cascata se não estiver configurado no DB.
        # Mas vamos tentar atualizar a PK diretamente (Postgres costuma reclamar se houver FKs sem cascade)
        # Vamos atualizar usuario_id em usuario_empresas primeiro
        conn.execute(text("UPDATE usuario_empresas SET usuario_id = :new_id WHERE usuario_id = :old_id"), {"new_id": new_uuid, "old_id": db_uuid})
        conn.execute(text("UPDATE usuarios SET id = :new_id WHERE id = :old_id"), {"new_id": new_uuid, "old_id": db_uuid})
        conn.commit()
        print(f"Sincronização concluída para {old_email}.")

def reset_password(user_uuid, password):
    url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_uuid}"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}"
    }
    r = httpx.put(url, headers=headers, json={"password": password})
    if r.status_code == 200:
        print(f"Senha resetada para {user_uuid}.")
    else:
        print(f"Erro ao resetar senha: {r.text}")

# --- EXECUÇÃO ---
auth_users = get_auth_users()
PASSWORD = "Teste@123"

target_emails = ["aws311274@gmail.com", "andre.w.souza@outlook.com"]

for au in auth_users:
    email = au.get('email')
    if email in target_emails:
        print(f"\n--- Processando {email} ---")
        update_db_user_id(email, au['id'])
        reset_password(au['id'], PASSWORD)

print(f"\nOperação finalizada. Senha: {PASSWORD}")
