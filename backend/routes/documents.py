# routes/documents.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException # UploadFile, File : Gestion des fichiers uploadés
from core import security
from services.document_processor import document_processor
from services.rag_service import rag_service
from typing import List

router = APIRouter()

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...), # Fichier obligatoire
    current_user: dict = Depends(security.get_current_user) # Auth requis
):
    """Upload et traitement d'un document"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nom de fichier manquant")
        
        # Traiter le fichier
        processing_result = document_processor.process_uploaded_file(file, current_user["id"])
        
        # Ajouter à la base de connaissances
        added_count = rag_service.add_knowledge_documents(
            texts=processing_result["texts"],
            metadata=processing_result["metadata"],
            user_id=current_user["id"]
        )
        
        return {
            "message": "Document traité avec succès",
            "filename": file.filename,
            "chunks_processed": processing_result["chunk_count"],
            "chunks_added": added_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur traitement document: {str(e)}")

@router.post("/documents/text") # Ajoute du texte directement sans fichier
async def add_text_document(
    text: str,
    source: str = "manual_input",
    current_user: dict = Depends(security.get_current_user)
):
    """Ajout de texte directement à la base de connaissances"""
    try:
        added_count = rag_service.add_knowledge_documents(
            texts=[text],
            metadata=[{"source": source}],
            user_id=current_user["id"]
        )
        
        return {
            "message": "Texte ajouté à la base de connaissances",
            "chunks_added": added_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur ajout texte: {str(e)}")
