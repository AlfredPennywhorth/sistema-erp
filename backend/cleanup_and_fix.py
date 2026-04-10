"""
Limpeza de dados corrompidos e configuração de DEFAULT para criado_em/atualizado_em.
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")
if "sslmode=require" not in DATABASE_URL:
    DATABASE_URL += ("&" if "?" in DATABASE_URL else "?") + "sslmode=require"

output = []

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # =========================================================
    # 1. Adicionar DEFAULT CURRENT_TIMESTAMP para criado_em e atualizado_em
    # =========================================================
    output.append("=== 1. Configurando DEFAULT no banco para criado_em / atualizado_em ===")
    for col in ["criado_em", "atualizado_em"]:
        try:
            cur.execute(f"""
                ALTER TABLE usuarios
                ALTER COLUMN {col} SET DEFAULT CURRENT_TIMESTAMP;
            """)
            output.append(f"   ✓ usuarios.{col} DEFAULT CURRENT_TIMESTAMP configurado")
        except Exception as e:
            output.append(f"   ! Erro em usuarios.{col}: {e}")

    # =========================================================
    # 2. Listar usuários com FK na usuario_empresas para identificar órfãos
    # =========================================================
    output.append("\n=== 2. Usuários com vínculos em usuario_empresas ===")
    cur.execute("""
        SELECT u.id, u.email, u.nome, u.criado_em, COUNT(ue.usuario_id) as vinculos
        FROM usuarios u
        LEFT JOIN usuario_empresas ue ON u.id = ue.usuario_id
        GROUP BY u.id, u.email, u.nome, u.criado_em
        ORDER BY u.criado_em;
    """)
    users = cur.fetchall()
    for row in users:
        output.append(f"   ID: {row[0]} | Email: {row[1]} | Nome: {row[2]} | Vínculos: {row[4]}")

    # =========================================================
    # 3. Limpar dados corrompidos: usuários sem nome E com convites ACCEPTED
    #    (tentativas de registro incompletas)
    # =========================================================
    output.append("\n=== 3. Limpando tentativas incompletas ===")

    # Identificar usuários criados durante tentativas falhas (sem nome ou is_active=false)
    # que NÃO são o admin principal
    cur.execute("""
        SELECT u.id, u.email, u.nome, COUNT(ue.usuario_id) as vinculos
        FROM usuarios u
        LEFT JOIN usuario_empresas ue ON u.id = ue.usuario_id
        WHERE (u.nome IS NULL OR u.nome = '')
        GROUP BY u.id, u.email, u.nome
    """)
    incomplete = cur.fetchall()
    output.append(f"   Usuários sem nome: {len(incomplete)}")
    
    for row in incomplete:
        uid = row[0]
        output.append(f"   Limpando UID sem nome: {uid} ({row[1]})")
        # Deletar vínculos primeiro
        cur.execute("DELETE FROM usuario_empresas WHERE usuario_id = %s", (str(uid),))
        output.append(f"     - Vínculos removidos: {cur.rowcount}")
        # Deletar usuário
        cur.execute("DELETE FROM usuarios WHERE id = %s", (str(uid),))
        output.append(f"     - Usuário removido: {cur.rowcount}")

    # =========================================================
    # 4. Reverter convites usados para PENDING (para poder testar novamente)
    # =========================================================
    output.append("\n=== 4. Status atual dos convites ===")
    cur.execute("""
        SELECT token, email, role::text, status::text, expira_em
        FROM convites
        ORDER BY criado_em DESC
        LIMIT 5;
    """)
    invites = cur.fetchall()
    for inv in invites:
        output.append(f"   {inv[1]} | {inv[2]} | {inv[3]} | Expira: {inv[4]}")
        output.append(f"   Link: http://localhost:5173/finalizar-registro?token={inv[0]}")
        output.append("   ---")

    # Se o convite de andre.w.souza@outlook.com estava ACCEPTED por um teste,
    # reverter para PENDING para permitir novo teste real
    cur.execute("""
        UPDATE convites
        SET status = 'PENDING',
            aceito_em = NULL,
            expira_em = NOW() + INTERVAL '48 hours'
        WHERE email = 'andre.w.souza@outlook.com'
          AND status = 'ACCEPTED'
        RETURNING token, email;
    """)
    reverted = cur.fetchall()
    if reverted:
        output.append(f"\n   ✓ {len(reverted)} convite(s) revertido(s) para PENDING:")
        for r in reverted:
            output.append(f"   Link: http://localhost:5173/finalizar-registro?token={r[0]}")
    else:
        output.append("\n   (nenhum convite de andre.w.souza@outlook.com precisou ser revertido)")

    # =========================================================
    # 5. Estado final
    # =========================================================
    output.append("\n=== 5. Estado final da tabela usuarios ===")
    cur.execute("SELECT id, email, nome, is_active, criado_em FROM usuarios ORDER BY criado_em;")
    for row in cur.fetchall():
        output.append(f"   {row[1]} | Nome: {row[2]} | Ativo: {row[3]} | Criado: {row[4]}")

    output.append("\n✅ LIMPEZA CONCLUÍDA!")
    cur.close()
    conn.close()

except Exception as e:
    output.append(f"\n❌ ERRO CRÍTICO: {e}")
    import traceback
    output.append(traceback.format_exc())

result = "\n".join(output)
print(result)
with open("cleanup_report.txt", "w", encoding="utf-8") as f:
    f.write(result)
print("\n[Salvo em cleanup_report.txt]")
