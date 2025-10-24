# services/rag_service.py 
from typing import List, Dict, Optional
from langchain.schema import Document # Document : Format standard LangChain pour les documents
from core.vectorstore import vector_store  # vector_store : La Base de données vectorielle FAISS
from services.llm_service import llm_service # llm_service : Service pour appeler les modèles de langage
from services.knowledge_management import knowledge_manager
from datetime import datetime
from core.database import db 
import asyncio

class RAGService:
    def __init__(self):
        self.vector_store = vector_store  # Initialisation de base vector
    
    def build_context_prompt(self, query: str, relevant_docs: List[Document]) -> str:
        """Prompt avec contexte"""
        if not relevant_docs: # Si pas de documents, prompt simple
            return f"Question: {query}\n\nRéponse:"
        
        context_text = "\n\n".join([
            f"Document {i+1} (Source: {doc.metadata.get('source', 'Inconnu')}):\n{doc.page_content}"
            for i, doc in enumerate(relevant_docs)
        ])
        
        return f"""Utilisez le contexte pour répondre précisément.

CONTEXTE:
{context_text}

QUESTION: {query}

RÉPONSE:"""
    
    async def process_query_with_rag(self, query: str, user_id: str, conversation_history: list = None) -> dict:
        """Traite une requête avec RAG et enrichment automatique"""
        try:
            
            # Recherche dans la base vectorielle
            relevant_docs = self.vector_store.search_similar(query, k=3, user_id=user_id)

            
            # Construction du prompt , Intègre les documents trouvés dans le prompt
            rag_prompt = self.build_context_prompt(query, relevant_docs)
            
            # Appel au LLM
            messages = [{"role": "system", "content": rag_prompt}]
            
            if conversation_history: #  Garde le contexte de la conversation
                for msg in conversation_history[-4:]:
                    messages.append({"role": msg['role'], "content": msg['content']})
                print("✅ Garde le contexte de la conversation")

            # Génère la réponse basée sur le contexte
            response =  await llm_service.get_response(messages)
            
            # Extrait les documents utilisés avec métadonnées
            sources = [{
                "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "source": doc.metadata.get("source", "Inconnu"),
                "user_id": doc.metadata.get("user_id", "System"),
            } for doc in relevant_docs]
            
            # Montre à l'utilisateur les sources utilisées
            return {
                "response": response,
                "sources": sources,
                "has_context": len(relevant_docs) > 0,
                "context_count": len(relevant_docs),
            }
            
        except Exception as e:
            print(f"❌ Erreur RAG: {str(e)}")
            return {
                "response": f"Je rencontre une difficulté technique avec la base de connaissances. Veuillez réessayer.",
                "sources": [],
                "has_context": False,
                "context_count": 0,
            }

    def add_knowledge_documents(self, texts: List[str], metadata: List[Dict], user_id: str):
        """Ajoute des documents à la base de connaissances"""
        try:
            documents = []
            for i, text in enumerate(texts):
                if text and text.strip():
                    doc_metadata = metadata[i] if i < len(metadata) else {}
                    doc_metadata.update({
                        "user_id": user_id,
                        "added_at": datetime.now().isoformat(),
                        "source": doc_metadata.get("source", "user_upload"),
                        "chunk_index": i
                    })
                    documents.append(Document(page_content=text.strip(), metadata=doc_metadata))
            
            if documents: #  Vérifie que le texte n'est pas vide
                return self.vector_store.add_documents(documents, user_id) # Ajout à la base : Appelle le vector store pour l'indexation
            return 0
            
        except Exception as e:
            print(f"❌ Erreur ajout documents: {str(e)}")
            return 0
            

# Instance globale
rag_service = RAGService()


