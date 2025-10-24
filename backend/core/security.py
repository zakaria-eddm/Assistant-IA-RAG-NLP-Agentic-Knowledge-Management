# core/security.py
import os
from datetime import datetime, timedelta
from functools import lru_cache # pour Cache des Utilisateurs
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer # OAuth2PasswordBearer : Schéma d'authentification OAuth2 pour FastAPI
from jose import JWTError, jwt #  Librairie pour JWT (JSON Web Tokens)
from .database import users_ref
from .config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")
user_cache = {} # Cache mémoire pour les données utilisateur

def create_access_token(data: dict, expires_delta: timedelta = None) -> str: # Création des Tokens JWT : Access Token (court terme)
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict) -> str: # Création des Tokens JWT : Refresh Token (long terme)
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.REFRESH_SECRET_KEY, algorithm=settings.ALGORITHM)


#  Cache des Utilisateurs
# @lru_cache(maxsize=128) # Garde les 128 users les plus récents
def get_user_from_cache(user_id: str): 
    # if user_id in user_cache:
    #     user_data, timestamp = user_cache[user_id]
    #     if (datetime.now() - timestamp).total_seconds() < 300: # 5 minutes (300 secondes) dans le cache
    #         return user_data
    
    user_doc = users_ref.document(user_id).get() #  Si pas en cache, va chercher dans Firebase
    if not user_doc.exists:
        return None
    
    user_data = user_doc.to_dict()
    user_data["id"] = user_id
    # user_cache[user_id] = (user_data, datetime.now())
    return user_data

# Vérification de l'Utilisateur Courant
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les identifiants",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "access":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception

    user_data = get_user_from_cache(user_id)
    if not user_data:
        raise credentials_exception

    return user_data

# Rafraîchissement du Token
async def refresh_access_token(refresh_token: str):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token invalide",
    )
    
    try:
        payload = jwt.decode(refresh_token, settings.REFRESH_SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "refresh":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception

    user_data = get_user_from_cache(user_id)
    if not user_data:
        raise credentials_exception

    new_access_token = create_access_token({"sub": user_id})
    return {
        "access_token": new_access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

def invalidate_user_cache(user_id: str): # Utilisé quand un user est modifié/supprimé
    """Invalide le cache pour un utilisateur spécifique"""
    # if user_id in user_cache:
    #     del user_cache[user_id]
    print(f"✅ Cache invalidé pour l'utilisateur: {user_id}")