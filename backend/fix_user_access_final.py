import os
import httpx
import uuid
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('backend/.env', override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DATABASE_URL = os.getenv("DATABASE_URL").replace("postgres://", "postgresql://")

def get_auth_users():
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {"apikey": SERVICE_ROLE_KEY, "Authorization": f"Bearer {SERVICE_ROLE_KEY}"}
    r = httpx.get(url, headers=headers)
    return r.json().get('users', [])

def fix_user(email, role, empresa_id, password):
    auth_users = get_auth_users()
    auth_user = next((u for u in auth_users if u.get('email') == email), None)
    
    if not auth_user:
        print(f"Erro: Usuário {email} não encontrado no Supabase Auth.")
        return

    new_id = auth_user['id']
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Busca ID atual no DB
        old_res = conn.execute(text("SELECT id, nome FROM usuarios WHERE email = :email"), {"email": email}).fetchone()
        if not old_res:
            print(f"Usuário {email} não encontrado na tabela 'usuarios'.")
            return
        
        old_id = str(old_res[0])
        nome = old_res[1]
        
        if old_id == new_id:
            print(f"Usuário {email} já está sincronizado no DB. Apenas resetando senha...")
        else:
            print(f"Sincronizando {email}: {old_id} -> {new_id}")
            # Remoção limpa dos vínculos antigos
            conn.execute(text("DELETE FROM usuario_empresas WHERE usuario_id = :oid"), {"oid": old_id})
            conn.execute(text("DELETE FROM usuarios WHERE id = :oid"), {"oid": old_id})
            
            # Inserção do novo ID
            conn.execute(text("INSERT INTO usuarios (id, email, nome, is_active) VALUES (:id, :email, :nome, true)"), 
                         {"id": new_id, "email": email, "nome": nome})
            
            # Inserção na tabela de vínculos (incluindo campos obrigatórios id e ativo)
            conn.execute(text("INSERT INTO usuario_empresas (id, usuario_id, empresa_id, role, ativo) VALUES (:id, :uid, :eid, :role, true)"), 
                         {"id": str(uuid.uuid4()), "uid": new_id, "eid": empresa_id, "role": role})
            conn.commit()
            print(f"Base de dados atualizada para {email}.")

    # Reset de senha
    reset_url = f"{SUPABASE_URL}/auth/v1/admin/users/{new_id}"
    httpx.put(reset_url, headers={"apikey": SERVICE_ROLE_KEY, "Authorization": f"Bearer {SERVICE_ROLE_KEY}"}, 
              json={"password": password})
    print(f"Senha de {email} definida como: {password}")

# --- EXECUÇÃO ---
# Dados coletados anteriormente
empresa_id = "5510f802-768f-4d34-95f0-35c167b44964"
password = os.getenv("DEFAULT_USER_PASSWORD", "TemporaryPassword123!")

fix_user("aws311274@gmail.com", "ADMIN", empresa_id, password)
fix_user("andre.w.souza@outlook.com", "OPERADOR", empresa_id, password)

print(f"\nConfiguração concluída com sucesso. Senha definida: {password}")

print("\nConfiguração concluída com sucesso.")
