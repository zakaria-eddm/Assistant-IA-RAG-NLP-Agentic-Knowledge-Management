# services/auth_service.py
from passlib.context import CryptContext # CryptContext : Pour le hashage des mots de passe
from datetime import datetime
import secrets # Génération d'IDs sécurisés
from fastapi import HTTPException, status
from google.cloud import firestore
from core.database import db
from core import security
from schemas.user_schemas import Token

# bcrypt : Algorithme de hashage sécurisé
# déprecated="auto" : Gère automatiquement les anciens formats
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Compare un mot de passe en clair avec un hash
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Convertit un mot de passe en clair en hash sécurisé
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Création d'Utilisateur
async def create_user(user_data: dict, background_tasks = None) -> Token:
    try:
        # Vérification de l'Email Unique
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', user_data['email']).limit(1)
        existing_users = query.get()
        
        if existing_users:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un utilisateur avec cet email existe déjà"
            )
        
        # Préparation des Données
        hashed_password = get_password_hash(user_data['password'])
        user_id = secrets.token_hex(12)
        now = datetime.now()
        
        user_dict = {
            'id': user_id,
            'email': user_data['email'],
            'name': user_data.get('name'),
            'hashed_password': hashed_password,
            'created_at': now,
            'updated_at': now
        }
        
        # Sauvegarde dans Firebase
        users_ref.document(user_id).set(user_dict)
        
        # Nettoie le cache utilisateur en arrière-plan
        if background_tasks:
            background_tasks.add_task(security.invalidate_user_cache, user_id)
        
        # Génération des Tokens
        access_token = security.create_access_token({"sub": user_id})
        refresh_token = security.create_refresh_token({"sub": user_id})
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=security.settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur création utilisateur: {str(e)}"
        )

#  Authentification Utilisateur
async def authenticate_user(email: str, password: str, background_tasks = None) -> Token:
    try:
        # Recherche par Email
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', email).limit(1)
        users = query.get()
        
        if not users:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect"
            )
        
        #  Vérification du Mot de Passe
        user_doc = users[0]
        user_data = user_doc.to_dict()
        
        if not verify_password(password, user_data['hashed_password']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect"
            )
        
        # Invalidation Cache
        if background_tasks:
            background_tasks.add_task(security.invalidate_user_cache, user_data['id'])
        
        # Génération Tokens
        access_token = security.create_access_token({"sub": user_data['id']})
        refresh_token = security.create_refresh_token({"sub": user_data['id']})
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=security.settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur authentification: {str(e)}"
        )