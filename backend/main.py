# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware #Gère les requêtes cross-origin (important pour les apps web)
from contextlib import asynccontextmanager # Gestionnaire de cycle de vie de l'application
import logging # Système de journalisation
from core.config import settings
from core.database import init_firebase, get_db
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.users import router as users_router
from routes.documents import router as documents_router
from routes.diagnostics import router as diagnostics_router
from routes.agentic import router as agentic_router
from routes.knowledge import router as knowledge
from core.vectorstore import vector_store


# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager # Décorateur pour gestion asynchrone
async def lifespan(app: FastAPI):
    # Démarrage - Initialisation
    logger.info("Démarrage de l'application Assistant IA...")
    try:
        # init_firebase()
        get_db()
        logger.info("✅ Firebase initialisé avec succès")
    except Exception as e:
        logger.error(f"❌ Erreur initialisation Firebase: {e}")
        raise
    
    try:
        # Init vectorstore lazy
        vector_store.init_vectorstore()
        logger.info("✅ VectorStore initialisé")

        
        logger.info("✅ Service de recherche web initialisé")

    except Exception as e:
        logger.error(f"❌ Erreur init VectorStore: {e}")
        # Ne pas crasher totalement si vectorstore fail, mais avertir
    yield
    logger.info("Arrêt de l'application...")
    # possibilité de save on shutdown
    try:
        vector_store.save_vectorstore()
        
    except:
        pass

app = FastAPI(
    title="Assistant IA Agentique API",
    description="API pour assistant IA dédié aux chercheurs, ingénieurs, étudiants, R&D et managers",
    version="1.0.0",
    lifespan=lifespan, # Gestion cycle de vie
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json" # Schema OpenAPI
)

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ # URLs autorisées
        "http://localhost:3000",    
        "http://localhost:19006",   # React Native dev
        "http://localhost:8000",    # FastAPI dev
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173", # React dev
        "http://192.168.1.100:8081",  # AJOUTEZ VOTRE IP ICI

    ],
    allow_credentials=True,
    allow_methods=["*"], # Toutes les méthodes HTTP
    allow_headers=["*"], # Tous les headers
)

# Inclusion des routeurs
app.include_router(auth_router, prefix="/api/v1", tags=["Authentication"])
app.include_router(chat_router, prefix="/api/v1", tags=["Chat"])
app.include_router(users_router, prefix="/api/v1", tags=["Users"])
app.include_router(documents_router, prefix="/api/v1", tags=["Documents"])
app.include_router(diagnostics_router, prefix="/api/v1", tags=["Diagnostics"])
app.include_router(agentic_router, prefix="/api/v1", tags=["Agentic"])
app.include_router(knowledge, prefix="/api/v1", tags=["knowledge"])

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Bienvenue sur l'API de l'Assistant IA Agentique",
        "version": "1.0.0",
        "description": "Assistant IA pour chercheurs, étudiants, ingénieurs",
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "endpoints": {
            "auth": "/api/v1/auth",
            "chat": "/api/v1/chat",
            "users": "/api/v1/users"
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy", 
        "service": "assistant-ia-api",
        "timestamp": "2025-09-12T00:00:00Z",
        "environment": settings.ENVIRONMENT
    }

@app.get("/info", tags=["Info"])
async def api_info():
    return {
        "api_name": "Assistant IA Agentique",
        "version": "1.0.0",
        "developer": "zakaria",
        "purpose": "Projet PFA - Assistant IA pour professionnels",
        "features": [
            "Authentification JWT",
            "Chat avec  LLM",
            "Sauvegarde Firebase",
            "API RESTful",
            "Documentation Swagger"
        ],
        "llm_provider": "Groq API",
        "database": "Firebase Firestore"
    }

# Gestionnaire d'erreurs global
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Erreur non gérée: {exc}")
    return {
        "error": "Une erreur interne est survenue",
        "details": str(exc) if settings.ENVIRONMENT == "development" else "Contactez l'administrateur"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        reload=True,
        log_level="info"
    )

    # uvicorn main:app --reload
    #uvicorn main:app --reload --host 0.0.0.0 --port 8000