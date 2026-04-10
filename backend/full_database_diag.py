import sqlite3

def diag():
    conn = sqlite3.connect('erp.db')
    c = conn.cursor()
    
    print("--- EMPRESAS ---")
    c.execute("SELECT id, razao_social FROM empresas")
    for r in c.fetchall(): print(r)
    
    print("\n--- USUARIOS ---")
    c.execute("SELECT id, email, nome FROM usuarios")
    for r in c.fetchall(): print(r)
    
    print("\n--- VINCULOS (USUARIO-EMPRESA) ---")
    c.execute("SELECT id, usuario_id, empresa_id, role FROM usuario_empresas")
    for r in c.fetchall(): print(r)
    
    print("\n--- CONVITES ---")
    c.execute("SELECT email, status, token FROM convites")
    for r in c.fetchall(): print(r)
    
    conn.close()

if __name__ == "__main__":
    diag()
