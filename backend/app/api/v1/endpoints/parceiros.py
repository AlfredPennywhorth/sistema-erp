from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import selectinload

from app.models.database import get_session, Parceiro, ParceiroContato
from app.schemas.parceiros import ParceiroCreate, ParceiroRead, ParceiroUpdate
from app.core.auth import get_current_user_id, get_current_tenant_id
from app.services.brasil_api import BrasilAPIService

router = APIRouter()

@router.get("/", response_model=List[ParceiroRead])
async def list_parceiros(
    session: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_current_tenant_id),
    is_cliente: Optional[bool] = None,
    is_fornecedor: Optional[bool] = None
):
    query = select(Parceiro).where(Parceiro.empresa_id == tenant_id).options(selectinload(Parceiro.contatos))
    
    if is_cliente is not None:
        query = query.where(Parceiro.is_cliente == is_cliente)
    if is_fornecedor is not None:
        query = query.where(Parceiro.is_fornecedor == is_fornecedor)
        
    return session.exec(query).all()

@router.post("/", response_model=ParceiroRead)
async def create_parceiro(
    parceiro_in: ParceiroCreate,
    session: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_current_tenant_id)
):
    # Extrai contatos se houver
    contatos_data = parceiro_in.contatos or []
    
    parceiro_dict = parceiro_in.model_dump(exclude={"contatos"})
    db_parceiro = Parceiro(**parceiro_dict)
    db_parceiro.empresa_id = tenant_id
    
    session.add(db_parceiro)
    
    try:
        session.flush() # Gera o ID do parceiro
        
        # Cria os contatos vinculados
        for contato_data in contatos_data:
            db_contato = ParceiroContato(
                **contato_data.model_dump(),
                parceiro_id=db_parceiro.id,
                empresa_id=tenant_id
            )
            session.add(db_contato)
            
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao criar parceiro: {str(e)}")
    
    session.refresh(db_parceiro)
    return db_parceiro

@router.get("/{parceiro_id}", response_model=ParceiroRead)
async def get_parceiro(
    parceiro_id: UUID,
    session: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_current_tenant_id)
):
    query = select(Parceiro).where(
        Parceiro.id == parceiro_id, 
        Parceiro.empresa_id == tenant_id
    ).options(selectinload(Parceiro.contatos))
    
    parceiro = session.exec(query).first()
    if not parceiro:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    return parceiro

@router.patch("/{parceiro_id}", response_model=ParceiroRead)
async def update_parceiro(
    parceiro_id: UUID,
    parceiro_data: ParceiroUpdate,
    session: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_current_tenant_id)
):
    db_parceiro = session.get(Parceiro, parceiro_id)
    if not db_parceiro or db_parceiro.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    
    data = parceiro_data.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(db_parceiro, key, value)
        
    session.add(db_parceiro)
    session.commit()
    session.refresh(db_parceiro)
    return db_parceiro

@router.delete("/{parceiro_id}")
async def delete_parceiro(
    parceiro_id: UUID,
    session: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_current_tenant_id)
):
    db_parceiro = session.get(Parceiro, parceiro_id)
    if not db_parceiro or db_parceiro.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    
    session.delete(db_parceiro)
    session.commit()
    return {"detail": "Parceiro removido com sucesso"}

@router.get("/cnpj/{cnpj}")
async def get_cnpj_info(
    cnpj: str,
    tenant_id: UUID = Depends(get_current_tenant_id)
):
    """Integração BrasilAPI para busca rápida de CNPJ"""
    return await BrasilAPIService.get_cnpj_info(cnpj)
