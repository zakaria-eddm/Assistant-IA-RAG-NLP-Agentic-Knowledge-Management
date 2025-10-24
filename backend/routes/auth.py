# routes/auth.py
# APIRouter : Pour créer des routes modulaires
# BackgroundTasks : Pour exécuter des tâches en arrière-plan
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
# OAuth2PasswordRequestForm : Formulaire standard OAuth2
from fastapi.security import OAuth2PasswordRequestForm
from schemas.user_schemas import UserCreate, Token
from services.auth_service import create_user, authenticate_user
from core import security

# Crée un routeur pour grouper les routes d'authentification
router = APIRouter()

# Inscription - POST /auth/signup
@router.post("/auth/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks = None
):
    return await create_user(user_data.dict(), background_tasks)

# Connexion - POST /auth/login
@router.post("/auth/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    background_tasks: BackgroundTasks = None
):
    return await authenticate_user(form_data.username, form_data.password, background_tasks)

# Rafraîchissement - POST /auth/refresh
@router.post("/auth/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    return await security.refresh_access_token(refresh_token)

# Déconnexion - POST /auth/logout
@router.post("/auth/logout")
async def logout(
    current_user: dict = Depends(security.get_current_user),
    background_tasks: BackgroundTasks = None
):
    if background_tasks:
        background_tasks.add_task(security.invalidate_user_cache, current_user["id"])
    return {"message": "Déconnexion réussie"}