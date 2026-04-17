from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from uuid import UUID
from typing import List, Optional

from app.models.database import RegraContabil, PlanoConta, UserRole
from app.schemas.accounting import RegraContabilCreate, RegraContabilRead, RegraContabilUpdate
from app.core.auth import get_session, get_current_tenant_id, RoleChecker

router = APIRouter()

# Controle de acesso: ADMIN, CONTADOR, OWNER, MANAGER
allow_admin_contador = RoleChecker(allowed_roles=[
    UserRole.ADMIN, 
    UserRole.CONTADOR, 
    UserRole.OWNER, 
    UserRole.MANAGER
])

def validate_contas(db: Session, empresa_id: UUID, conta_debito_id: UUID, conta_credito_id: UUID):
    """
    Valida se as contas existem, pertencem à empresa, estão ativas e são analíticas.
    """
    contas_ids = [conta_debito_id, conta_credito_id]
    stmt = select(PlanoConta).where(PlanoConta.id.in_(contas_ids))
    contas = db.exec(stmt).all()
    
    dict_contas = {c.id: c for c in contas}
    
    for cid in contas_ids:
        if cid not in dict_contas:
            raise HTTPException(status_code=404, detail=f"Conta {cid} não encontrada.")
        
        conta = dict_contas[cid]
        
        if str(conta.empresa_id) != str(empresa_id):
             raise HTTPException(status_code=400, detail=f"Conta {cid} não pertence a esta empresa.")
        
        if not conta.ativo:
            raise HTTPException(status_code=400, detail=f"Conta {cid} está inativa.")
            
        if not conta.is_analitica:
            raise HTTPException(status_code=400, detail=f"Conta {cid} deve ser analítica para lançamentos.")

@router.get("/rules", response_model=List[RegraContabilRead])
async def list_rules(
    db: Session = Depends(get_session),
    empresa_id: UUID = Depends(get_current_tenant_id),
    include_inactive: bool = False,
    _auth = Depends(allow_admin_contador)
):
    stmt = select(RegraContabil).where(RegraContabil.empresa_id == empresa_id)
    if not include_inactive:
        stmt = stmt.where(RegraContabil.ativo == True)
    
    results = db.exec(stmt).all()
    
    # Enriquecer com nomes das contas
    regras_read = []
    for r in results:
        regra_dict = r.model_dump()
        
        # Buscar nomes (poderia ser feito com JOIN para performance, mas para tela estável de teste vamos simples)
        c_deb = db.get(PlanoConta, r.conta_debito_id)
        c_cre = db.get(PlanoConta, r.conta_credito_id)
        
        regra_dict["nome_conta_debito"] = c_deb.nome if c_deb else "N/A"
        regra_dict["nome_conta_credito"] = c_cre.nome if c_cre else "N/A"
        
        regras_read.append(RegraContabilRead(**regra_dict))
        
    return regras_read

@router.get("/rules/{rule_id}", response_model=RegraContabilRead)
async def get_rule(
    rule_id: UUID,
    db: Session = Depends(get_session),
    empresa_id: UUID = Depends(get_current_tenant_id),
    _auth = Depends(allow_admin_contador)
):
    regra = db.get(RegraContabil, rule_id)
    if not regra or str(regra.empresa_id) != str(empresa_id):
        raise HTTPException(status_code=404, detail="Regra não encontrada.")
    
    regra_dict = regra.model_dump()
    c_deb = db.get(PlanoConta, regra.conta_debito_id)
    c_cre = db.get(PlanoConta, regra.conta_credito_id)
    regra_dict["nome_conta_debito"] = c_deb.nome if c_deb else "N/A"
    regra_dict["nome_conta_credito"] = c_cre.nome if c_cre else "N/A"
    
    return RegraContabilRead(**regra_dict)

@router.post("/rules", response_model=RegraContabilRead)
async def create_rule(
    regra_in: RegraContabilCreate,
    db: Session = Depends(get_session),
    empresa_id: UUID = Depends(get_current_tenant_id),
    _auth = Depends(allow_admin_contador)
):
    # Validações estritas de contas
    validate_contas(db, empresa_id, regra_in.conta_debito_id, regra_in.conta_credito_id)
    
    # Validação de unicidade
    existente = db.exec(select(RegraContabil).where(
        RegraContabil.empresa_id == empresa_id,
        RegraContabil.tipo_evento == regra_in.tipo_evento,
        RegraContabil.natureza == regra_in.natureza
    )).first()
    
    if existente:
        raise HTTPException(status_code=400, detail="Já existe uma regra para este evento e natureza nesta empresa.")

    nova_regra = RegraContabil(
        **regra_in.model_dump(),
        empresa_id=empresa_id
    )
    db.add(nova_regra)
    db.commit()
    db.refresh(nova_regra)
    
    return await get_rule(nova_regra.id, db, empresa_id)

@router.patch("/rules/{rule_id}", response_model=RegraContabilRead)
async def update_rule(
    rule_id: UUID,
    regra_update: RegraContabilUpdate,
    db: Session = Depends(get_session),
    empresa_id: UUID = Depends(get_current_tenant_id),
    _auth = Depends(allow_admin_contador)
):
    regra = db.get(RegraContabil, rule_id)
    if not regra or str(regra.empresa_id) != str(empresa_id):
        raise HTTPException(status_code=404, detail="Regra não encontrada.")
    
    update_data = regra_update.model_dump(exclude_unset=True)
    
    # Se mudar contas, revalida
    c_deb = update_data.get("conta_debito_id", regra.conta_debito_id)
    c_cre = update_data.get("conta_credito_id", regra.conta_credito_id)
    
    if "conta_debito_id" in update_data or "conta_credito_id" in update_data:
        validate_contas(db, empresa_id, c_deb, c_cre)
        
    for key, value in update_data.items():
        setattr(regra, key, value)
        
    db.add(regra)
    db.commit()
    db.refresh(regra)
    
    return await get_rule(regra.id, db, empresa_id)

@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: UUID,
    db: Session = Depends(get_session),
    empresa_id: UUID = Depends(get_current_tenant_id),
    _auth = Depends(allow_admin_contador)
):
    """
    DESATIVAÇÃO LÓGICA (ativo = false)
    """
    regra = db.get(RegraContabil, rule_id)
    if not regra or str(regra.empresa_id) != str(empresa_id):
        raise HTTPException(status_code=404, detail="Regra não encontrada.")
    
    regra.ativo = False
    db.add(regra)
    db.commit()
    
    return {"status": "success", "message": "Regra desativada com sucesso."}
