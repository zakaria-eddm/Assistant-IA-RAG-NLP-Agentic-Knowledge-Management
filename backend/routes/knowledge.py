# routes/knowledge.py
from fastapi import APIRouter, Depends, HTTPException # Depends : Pour l'injection de dépendances (authentification)
from core import security
from services.knowledge_management import knowledge_manager

router = APIRouter()

@router.get("/knowledge/stats")
async def get_knowledge_stats(
    current_user: dict = Depends(security.get_current_user) # Authentification requise : Via get_current_user
):
    """Statistiques des connaissances"""
    try:
        stats = await knowledge_manager.get_user_stats(current_user["id"])
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/knowledge/entries")
async def get_knowledge_entries(
    current_user: dict = Depends(security.get_current_user),
    limit: int = 10 # limit : Nombre maximum d'entrées à retourner
):
    """Entries de connaissances de l'utilisateur"""
    try:
        entries = await knowledge_manager.get_user_knowledge(current_user["id"], limit)
        return {"entries": entries}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))