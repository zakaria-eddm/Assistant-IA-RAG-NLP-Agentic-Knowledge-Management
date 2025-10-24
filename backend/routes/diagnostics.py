# routes/diagnostics.py
from fastapi import APIRouter, Depends
from core import security
from core.vectorstore import vector_store
from services.rag_service import rag_service

router = APIRouter()

@router.get("/diagnostics/vectorstore")
async def vectorstore_diagnostics(
    current_user: dict = Depends(security.get_current_user)
):
    """Diagnostics du vector store"""
    try:
        # Test de recherche
        test_results = vector_store.search_similar("test", k=2, user_id=current_user["id"])
        
        # Statistiques
        stats = vector_store.get_stats()
        
        return {
            "status": "healthy",
            "vectorstore_type": "FAISS",
            "test_search_results": len(test_results),
            "user_id": current_user["id"],
            "stats": stats,
            "message": "FAISS vector store operational"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "vectorstore_type": "FAISS",
            "user_id": current_user["id"]
        }

@router.get("/diagnostics/rag")
async def rag_diagnostics(
    current_user: dict = Depends(security.get_current_user)
):
    """Test complet du système RAG"""
    try:
        # Test avec une requête simple
        test_query = "Qu'est-ce que l'intelligence artificielle ?"
        result = await rag_service.process_query_with_rag(test_query, current_user["id"])
        
        return {
            "status": "healthy",
            "query": test_query,
            "has_context": result["has_context"],
            "context_count": result["context_count"],
            "response_preview": result["response"][:100] + "..." if len(result["response"]) > 100 else result["response"],
            "vectorstore_stats": vector_store.get_stats()
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "query": "Test query failed"
        }
@router.get("/diagnostics/llm")
async def llm_diagnostics():
    """Test de connexion au LLM"""
    from services.llm_service import llm_service
    try:
        success = llm_service.test_connection()
        return {"status": "success" if success else "error", "message": "Test LLM effectué"}
    except Exception as e:
        return {"status": "error", "error": str(e)}