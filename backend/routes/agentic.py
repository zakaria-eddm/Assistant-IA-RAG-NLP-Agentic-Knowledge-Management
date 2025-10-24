# routes/agentic.py 
from fastapi import APIRouter, Depends, HTTPException
from core import security
from services.agentic_service import agentic_service
from typing import Dict, Any
from pydantic import BaseModel
from core.database import db
from google.cloud import firestore

router = APIRouter()

# Ajouter un modèle Pydantic pour la validation
class AgenticActionRequest(BaseModel):
    action: str
    parameters: Dict[str, Any] = {}

@router.post("/agentic/execute")
async def execute_agentic_action(
    action_data: AgenticActionRequest,  # Utiliser le modèle Pydantic
    current_user: dict = Depends(security.get_current_user)
):
    """Exécute une action agentique"""
    try:
        action_name = action_data.action  # Accès via le modèle
        parameters = action_data.parameters
        
        if not action_name:
            raise HTTPException(status_code=400, detail="Nom de l'action requis")
        
        result = await agentic_service.execute_action(
            action_name, parameters, current_user["id"]
        )
        
        # Sauvegarder l'historique des actions
        await _save_action_history(current_user["id"], result)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur exécution action: {str(e)}")

@router.get("/agentic/actions")
async def get_available_actions(
    current_user: dict = Depends(security.get_current_user)
):
    """Retourne la liste des actions agentiques disponibles"""
    try:
        actions = agentic_service.get_available_actions()
        return {"actions": actions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur récupération actions: {str(e)}")

@router.get("/agentic/history")
async def get_action_history(
    current_user: dict = Depends(security.get_current_user),
    limit: int = 10
):
    """Retourne l'historique des actions agentiques"""
    try:
        actions_ref = db.collection('users').document(current_user["id"]).collection('agentic_actions')
        actions = [doc.to_dict() for doc in actions_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit).stream()]
        return {"history": actions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur récupération historique: {str(e)}")

async def _save_action_history(user_id: str, action_result: Dict):
    """Sauvegarde l'historique des actions"""
    try:
        actions_ref = db.collection('users').document(user_id).collection('agentic_actions')
        action_id = secrets.token_hex(8)
        
        action_result["id"] = action_id
        action_result["user_id"] = user_id
        action_result["saved_at"] = datetime.now().isoformat()
        
        actions_ref.document(action_id).set(action_result)
        
    except Exception as e:
        print(f"❌ Erreur sauvegarde historique action: {e}")