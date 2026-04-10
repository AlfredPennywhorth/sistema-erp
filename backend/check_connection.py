import requests
import sqlite3
import os

def check_backend():
    url = "http://127.0.0.1:8000/"
    try:
        print(f"--- Verificando Backend ({url}) ---")
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            print(f"[OK] Backend ONLINE: {response.json()}")
            return True
        else:
            print(f"[ERRO] Backend respondeu com status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("[ERRO] Não foi possível conectar ao backend em http://127.0.0.1:8000")
        print("Certifique-se de rodar: python -m app.main (dentro da pasta backend)")
    except Exception as e:
        print(f"[ERRO] Erro inesperado: {str(e)}")
    return False

def check_db():
    db_path = "erp.db"
    print(f"\n--- Verificando Banco de Dados ({db_path}) ---")
    if not os.path.exists(db_path):
        print("[ERRO] Arquivo erp.db não encontrado!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verificar tabelas essenciais (Nomes definidos em __tablename__)
        tables = ["usuarios", "empresas", "convites", "usuario_empresas"]
        for table in tables:
            cursor.execute(f"SELECT count(*) FROM sqlite_master WHERE type='table' AND name='{table}';")
            if cursor.fetchone()[0] == 1:
                cursor.execute(f"SELECT count(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"[OK] Tabela '{table}': OK ({count} registros)")
            else:
                print(f"[ERRO] Tabela '{table}': NÃO ENCONTRADA")
        
        conn.close()
        return True
    except Exception as e:
        print(f"[ERRO] Erro ao acessar banco: {str(e)}")
    return False

if __name__ == "__main__":
    b_ok = check_backend()
    d_ok = check_db()
    
    if b_ok and d_ok:
        print("\n[SUCESSO] TUDO PRONTO! O sistema está operando corretamente.")
    else:
        print("\n[AVISO] Alguns componentes não estão funcionando corretamente.")
