# routes/users.py 
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from core import security
from schemas.user_schemas import UserResponse, UserUpdate
from core.database import users_ref, db
from datetime import datetime
import secrets

router = APIRouter()

# Importer pwd_context depuis auth_service
from services.auth_service import pwd_context

@router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(security.get_current_user)
):
    return current_user

@router.put("/users/me", response_model=UserResponse)
async def update_user_info(
    user_data: UserUpdate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(security.get_current_user)
):
    """Met à jour les informations de l'utilisateur"""
    try:
        update_data = {}
        
        if user_data.name is not None:
            update_data["name"] = user_data.name
        
        if user_data.password is not None and user_data.password != "":
            update_data["hashed_password"] = pwd_context.hash(user_data.password)
        
        if update_data:
            update_data["updated_at"] = datetime.now()
            users_ref.document(current_user["id"]).update(update_data)
            
            # Invalider le cache IMMÉDIATEMENT
            security.invalidate_user_cache(current_user["id"])
            
            # Forcer le rechargement des données utilisateur
            user_doc = users_ref.document(current_user["id"]).get()
            if user_doc.exists:
                updated_user = user_doc.to_dict()
                updated_user["id"] = current_user["id"]
                
                # S'assurer que tous les champs requis sont présents
                if "created_at" not in updated_user:
                    updated_user["created_at"] = datetime.now()
                if "updated_at" not in updated_user:
                    updated_user["updated_at"] = datetime.now()
                
                return updated_user
        
        # Retourner les données actuelles si aucune modification
        return current_user
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur mise à jour utilisateur: {str(e)}")

@router.delete("/users/me")
async def delete_user_account(
    current_user: dict = Depends(security.get_current_user)
):
    """Supprime le compte utilisateur et toutes ses données"""
    try:
        user_id = current_user["id"]
        
        # Supprimer toutes les conversations
        convs_ref = db.collection('users').document(user_id).collection('conversations')
        for doc in convs_ref.stream():
            doc.reference.delete()
        
        # Supprimer l'utilisateur
        db.collection('users').document(user_id).delete()
        
        # Invalider le cache
        security.invalidate_user_cache(user_id)
        
        return {"message": "Compte et données supprimés avec succès"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))