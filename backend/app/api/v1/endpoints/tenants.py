from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlmodel import Session, select
from uuid import UUID
from datetime import datetime
from typing import Dict, Any

from app.models.database import engine, Empresa, LogAuditoria, RegimeTributario, User, UsuarioEmpresa, UserRole
from app.services.brasil_api import BrasilAPIService
from app.schemas.tenants import TenantSetupSchema
from app.core.auth import get_session
from app.services.seeder import SeederService

router = APIRouter()

@router.get("/check-cnpj/{cnpj}")
def check_cnpj(
    cnpj: str,
    session: Session = Depends(get_session)
):
    """
    Verifica se um CNPJ já está cadastrado no sistema.
    """
    # Limpeza rápida
    clean_cnpj = "".join(filter(str.isdigit, cnpj))
    
    stmt = select(Empresa).where(Empresa.cnpj == clean_cnpj)
    empresa = session.exec(stmt).first()
    
    if empresa:
        return {
            "exists": True,
            "razao_social": empresa.razao_social,
            "mensagem": "Esta empresa já possui cadastro no sistema."
        }
    
    return {"exists": False}

@router.post("/setup", status_code=status.HTTP_201_CREATED)
def setup_tenant(
    setup_data: TenantSetupSchema,
    session: Session = Depends(get_session)
):
    # 1. Consultar BrasilAPI (Simulado ou Real) para enriquecer dados
    try:
        from app.services.brasil_api import BrasilAPIService
        import asyncio
        # Chame de forma síncrona ou use uma estratégia de fallback
        cnpj_info = {} # Simplificando para teste
    except Exception as e:
        print(f'>>> [ALERTA] BrasilAPI falhou: {str(e)}')
        cnpj_info = {}

    try:
        # Iniciamos a transação explícita
        # Nota: session.begin() pode ser redundante se o generator get_session já estiver em bloco,
        # mas aqui reforçamos a lógica atômica solicitada.
        
        # 2. Verificar se a empresa já existe
        stmt_empresa = select(Empresa).where(Empresa.cnpj == setup_data.cnpj)
        empresa = session.exec(stmt_empresa).first()
        
        if empresa:
            # Se a empresa já existe, verificar se o usuário já tem vínculo
            user_id = setup_data.usuario_id
            stmt_check = select(UsuarioEmpresa).where(
                UsuarioEmpresa.usuario_id == user_id,
                UsuarioEmpresa.empresa_id == empresa.id
            )
            if session.exec(stmt_check).first():
                return {
                    "message": "Empresa carregada com sucesso!",
                    "empresa_id": str(empresa.id),
                    "status": "EXISTING_LINK"
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Este CNPJ já está cadastrado por outro administrador."
                )

        # 3. Criar a Empresa
        empresa = Empresa(
            cnpj=setup_data.cnpj,
            razao_social=cnpj_info.get("razao_social") or setup_data.razao_social,
            regime_tributario=setup_data.regime_tributario,
            cep=setup_data.cep,
            logradouro=cnpj_info.get("logradouro") or setup_data.logradouro,
            numero=setup_data.numero,
            complemento=setup_data.complemento,
            bairro=cnpj_info.get("bairro") or setup_data.bairro,
            cidade=cnpj_info.get("municipio") or setup_data.cidade,
            uf=cnpj_info.get("uf") or setup_data.uf,
            codigo_municipio_ibge=str(cnpj_info.get("codigo_municipio_ibge", "0000000")),
            cnae_principal=cnpj_info.get("cnae_fiscal_principal", "0000000")
        )
        session.add(empresa)
        session.flush() # Gerar ID da empresa

        # 4. Garantir que o Usuário existe no BD (Sincronizado com Supabase)
        user_id = setup_data.usuario_id
        db_user = session.get(User, user_id)
        if not db_user:
            db_user = User(
                id=user_id,
                email=setup_data.email,
                nome=setup_data.razao_social # Nome provisório vindo da Razão Social ou Admin
            )
            session.add(db_user)
            session.flush()

        # 5. Criar o Vínculo N:N como ADMIN (A Trifeta)
        vinculo = UsuarioEmpresa(
            usuario_id=user_id,
            empresa_id=empresa.id,
            role=UserRole.ADMIN,
            ativo=True
        )
        session.add(vinculo)

        # 6. Log de Auditoria
        log = LogAuditoria(
            empresa_id=empresa.id,
            usuario_id=user_id,
            acao="SETUP_TENANT_ATOMIC",
            tabela_afetada="empresas",
            registro_id=empresa.id,
            dados_novos={"cnpj": empresa.cnpj, "role": "ADMIN"}
        )
        session.add(log)
        
        # 7. Disparar injeção do Modelo de Plano de Contas Referencial CFC
        cnae = empresa.cnae_principal
        if cnae.startswith("45") or cnae.startswith("46") or cnae.startswith("47"):
            segmento = "comercio"
        elif cnae.startswith("1") or cnae.startswith("2") or cnae.startswith("3"):
            segmento = "industria"
        else:
            segmento = "servicos"
            
        print(f">>> [SETUP] Injetando Plano de Contas (Segmento: {segmento} / CNAE: {cnae})")
        SeederService.seed_plano_contas(session=session, empresa_id=empresa.id, segmento=segmento)
        
        print(f">>> [SETUP] Injetando Centros de Custo Básicos")
        SeederService.seed_centros_custo(session=session, empresa_id=empresa.id)

        print(f">>> [SETUP] Injetando Formas de Pagamento Padrão")
        SeederService.seed_formas_pagamento(session=session, empresa_id=empresa.id)
        
        # Commit Final da Transação
        session.commit()

        print('>>> [DEBUG] ENVIANDO RESPOSTA FINAL PARA O FRONTEND')
        return {"status": "ok", "message": "created"}

    except Exception as e:
        session.rollback()
        import traceback
        error_msg = f"ERRO CRITICO NO SETUP: {str(e)}"
        print(f">>> [ERRO] {error_msg}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )

@router.get("/me", response_model=Dict[str, Any])
def get_current_tenant_info(
    session: Session = Depends(get_session),
    tenant_id: str = Header(None, alias="X-Tenant-ID"),
    user_id: str = Header(None, alias="X-User-ID")
):
    """
    Retorna as informações da empresa conectada ao Tenant ID atual.
    """
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID não fornecido.")
    
    try:
        tenant_uuid = UUID(tenant_id)
        empresa = session.get(Empresa, tenant_uuid)
        
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada.")
            
        data = {
            "id": str(empresa.id),
            "razao_social": empresa.razao_social,
            "nome_fantasia": empresa.nome_fantasia,
            "cnpj": empresa.cnpj,
            "logo_url": empresa.configuracoes.get("logo_url") if empresa.configuracoes else None,
            "user_role": None
        }

        # Tentar buscar a role do usuário
        if user_id:
            from app.models.database import UsuarioEmpresa
            user_uuid = user_id if isinstance(user_id, UUID) else UUID(user_id)
            stmt = select(UsuarioEmpresa).where(
                UsuarioEmpresa.usuario_id == user_uuid,
                UsuarioEmpresa.empresa_id == tenant_uuid
            )
            vinculo = session.exec(stmt).first()
            if vinculo:
                data["user_role"] = vinculo.role

        return data
    except ValueError:
        raise HTTPException(status_code=400, detail="Tenant ID inválido.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao recuperar dados do tenant: {str(e)}")

@router.get("/list")
def list_user_tenants(
    session: Session = Depends(get_session),
    user_id: str = Header(None, alias="X-User-ID")
):
    """
    Lista todas as empresas vinculadas ao usuário atual.
    """
    if not user_id:
        return []
    
    try:
        user_uuid = UUID(user_id)
        # Consulta join entre UsuarioEmpresa e Empresa
        stmt = select(Empresa).join(UsuarioEmpresa).where(UsuarioEmpresa.usuario_id == user_uuid)
        results = session.exec(stmt).all()
        
        return [
            {
                "id": str(empresa.id),
                "razao_social": empresa.razao_social,
                "cnpj": empresa.cnpj
            }
            for empresa in results
        ]
    except Exception as e:
        print(f"Erro ao listar tenants do usuário: {e}")
        return []
