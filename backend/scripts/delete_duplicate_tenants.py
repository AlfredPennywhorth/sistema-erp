import sys
import os
from sqlalchemy import text
from sqlmodel import Session, select

# Adiciona o diretório raiz ao path para importar os módulos do app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import engine, Empresa, UsuarioEmpresa

def cleanup_duplicates():
    print(">>> Iniciando limpeza de empresas duplicadas...")
    
    with Session(engine) as session:
        # 1. Identificar CNPJs duplicados
        stmt = text("""
            SELECT cnpj, COUNT(*) 
            FROM empresas 
            GROUP BY cnpj 
            HAVING COUNT(*) > 1
        """)
        duplicates = session.execute(stmt).all()
        
        if not duplicates:
            print(">>> Nenhuma duplicata encontrada.")
        else:
            for cnpj, count in duplicates:
                print(f">>> Processando CNPJ duplicado: {cnpj} ({count} ocorrencias)")
                
                # Buscar todas as empresas com esse CNPJ
                stmt_empresas = select(Empresa).where(Empresa.cnpj == cnpj).order_by(Empresa.id)
                empresas = session.exec(stmt_empresas).all()
                
                # Manter a primeira (mais antiga/padrão) e remover as outras
                original = empresas[0]
                to_remove = empresas[1:]
                
                for dup in to_remove:
                    print(f"    - Removendo duplicata ID: {dup.id} ({dup.razao_social})")
                    
                    # Mover vínculos de usuários para a empresa original se não existirem
                    stmt_vinculos = select(UsuarioEmpresa).where(UsuarioEmpresa.empresa_id == dup.id)
                    vinculos = session.exec(stmt_vinculos).all()
                    
                    for v in vinculos:
                        # Verificar se o usuário já tem vínculo com a original
                        stmt_check = select(UsuarioEmpresa).where(
                            UsuarioEmpresa.usuario_id == v.usuario_id,
                            UsuarioEmpresa.empresa_id == original.id
                        )
                        if not session.exec(stmt_check).first():
                            v.empresa_id = original.id
                            session.add(v)
                        else:
                            session.delete(v)
                    
                    session.delete(dup)
            
            session.commit()
            print(">>> Limpeza concluida com sucesso.")

        # 2. Tentar aplicar a constraint UNIQUE se for PostgreSQL
        if "postgresql" in str(engine.url):
            try:
                print(">>> Tentando reforçar constraint UNIQUE no banco de dados...")
                session.execute(text("ALTER TABLE empresas ADD CONSTRAINT unique_cnpj UNIQUE (cnpj)"))
                session.commit()
                print(">>> Constraint UNIQUE aplicada com sucesso.")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(">>> Constraint UNIQUE ja existe no banco de dados.")
                else:
                    print(f">>> Erro ao aplicar constraint (provavelmente ja existe): {e}")

if __name__ == "__main__":
    cleanup_duplicates()
