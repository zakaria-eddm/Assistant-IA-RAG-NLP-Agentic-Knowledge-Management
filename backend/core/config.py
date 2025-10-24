# core/config.py
import os #Module pour accéder aux variables d'environnement système
from dotenv import load_dotenv  # dotenv : Charge les variables depuis un fichier .env

load_dotenv() # Lit le fichier .env et charge les variables dans l'environnement

class Settings:
    # Groq API 
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY")
    GROQ_API_URL: str = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY") # Clé secrète pour signer les tokens d'accès
    REFRESH_SECRET_KEY: str = os.getenv("REFRESH_SECRET_KEY") #  Clé pour les tokens de rafraîchissement
    ALGORITHM: str = "HS256"  # Algorithme de chiffrement (HS256 = HMAC avec SHA-256)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15)) # Durée de vie token accès (15 min par défaut)
    REFRESH_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", 10080)) # Durée de vie token rafraîchissement (7 jours = 10080 min)
    
    # Firebase
    PROJECT_ID: str = os.getenv("PROJECT_ID")
    FIREBASE_CREDENTIALS: str = os.getenv("FIREBASE_CREDENTIALS") # Clés d'authentification Firebase
    
    # App
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Validation : Vérification que les clés essentielles sont présentes
    if not SECRET_KEY or not REFRESH_SECRET_KEY:
        raise ValueError("Les clés secrètes doivent être définies")

settings = Settings()
