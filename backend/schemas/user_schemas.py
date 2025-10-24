# schemas/user_schemas.py
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional, List

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int

class TokenData(BaseModel):
    user_id: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Nouveau nom de l'utilisateur")
    password: Optional[str] = Field(None, description="Nouveau mot de passe")

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
