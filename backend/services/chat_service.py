# services/chat_service.py 
from datetime import datetime
from google.cloud import firestore
from core.database import db
from services.rag_service import rag_service
from services.agentic_service import agentic_service
from typing import List, Dict, Optional
from services.knowledge_management import knowledge_manager
import re
import asyncio


class ChatService:
    def __init__(self):
        self.rag_service = rag_service
        self.agentic_service = agentic_service
    
    async def process_chat_message(self, user_id: str, message: str, conversation_id: str = None, use_agentic: bool = True):
        """Service de chat unifié avec détection intelligente"""
        try:
            print(f"💬 Message: {message}")
            print(f"Mode agentique: {'ACTIVÉ' if use_agentic else 'DÉSACTIVÉ'}")
            

                    # Récupérer l'historique de conversation
            conversation_history = []
            if conversation_id:
                conversation_history = await self._get_conversation_history(user_id, conversation_id)

            # 1. Détection d'intention (seulement si agentique activé)
            if use_agentic:
                intention = await self._detect_agentic_intention(message)
                print(f"Intention détectée: {intention}")
                
                if intention["is_agentic"] and intention["confidence"] > 0.6:
                    return await self._handle_agentic_action(user_id, message, conversation_id, intention, conversation_history)
            
            # 2. Fallback vers RAG standard
            return await self._handle_rag_response(user_id, message, conversation_id, conversation_history)
            
        except Exception as e:
            print(f"❌ Erreur traitement chat: {str(e)}")
            return await self._handle_error(user_id, message, conversation_id, str(e))
    
    async def _handle_agentic_action(self, user_id: str, message: str, conversation_id: str, intention: Dict, conversation_history: List[Dict] = None):
        """Gère une action agentique"""
        try:
            # Enrichissement avec les connaissances
            enriched_context = await knowledge_manager.enhance_with_knowledge(
                message, user_id, intention["action_type"]
            )
            
            # Exécution de l'action
            action_result = await self.agentic_service.execute_action(
                intention["action_type"], 
                intention["parameters"], 
                user_id
            )
            
            # Construction de la réponse
            response = self._build_agentic_response(message, action_result)
            
            # Apprentissage
            await knowledge_manager.learn_from_interaction(
                user_id, message, action_result, intention["action_type"]
            )
            
            # Sauvegarde
            conv_data = await self._save_conversation(
                user_id, message, response, conversation_id, 
                is_agentic=True, action_result=action_result
            )
            
            return {
                "message": response,
                "conversation_id": conv_data["conversation_id"],
                "actions_executed": True,
                "action_results": action_result
            }
            
        except Exception as e:
            print(f"❌ Erreur action agentique: {e}")
            return await self._handle_rag_response(user_id, message, conversation_id, conversation_history)
    
    async def _handle_rag_response(self, user_id: str, message: str, conversation_id: str, conversation_history: List[Dict] = None):
        """Gère une réponse RAG standard"""
        try:
             # Récupérer l'historique de conversation si conversation_id existe
            conversation_history = []
            if conversation_id:
                conversation_history = await self._get_conversation_history(user_id, conversation_id)

             # Passer l'historique de conversation au service RAG
            rag_result = await self.rag_service.process_query_with_rag(
                message, 
                user_id, 
                conversation_history=conversation_history
            )

            # Apprentissage
            await knowledge_manager.learn_from_interaction(
                user_id, message, {"response": rag_result["response"]}, "rag_conversation"
            )
            
            # Sauvegarde
            conv_data = await self._save_conversation(
                user_id, message, rag_result["response"], conversation_id, 
                is_agentic=False, context_info=rag_result
            )
            
            return {
                "message": rag_result["response"],
                "conversation_id": conv_data["conversation_id"],
                "actions_executed": False,
                "has_context": rag_result["has_context"]
            }
            
        except Exception as e:
            print(f"❌ Erreur RAG: {e}")
            raise
    
    async def _get_conversation_history(self, user_id: str, conversation_id: str) -> List[Dict]:
        """Récupère l'historique d'une conversation spécifique"""
        try:
            from core.database import db
            conv_ref = db.collection('users').document(user_id).collection('conversations').document(conversation_id)
            conversation = conv_ref.get()
            
            if conversation.exists:
                conv_data = conversation.to_dict()
                messages = conv_data.get('messages', [])
                
                # Formater l'historique pour le prompt
                history = []
                for msg in messages:
                    history.append({
                        "role": msg.get('role', 'user'),
                        "content": msg.get('content', '')
                    })
                
                return history
            
            return []
            
        except Exception as e:
            print(f"❌ Erreur récupération historique: {e}")
            return []



    async def _save_conversation(self, user_id: str, user_message: str, ai_response: str, 
                               conversation_id: str = None, is_agentic: bool = False, 
                               action_result: Dict = None, context_info: Dict = None):
        """Sauvegarde la conversation"""
        try:
            message_data = {
                'role': 'user',
                'content': user_message,
                'timestamp': datetime.now().isoformat()
            }
            
            ai_message_data = {
                'role': 'assistant', 
                'content': ai_response,
                'timestamp': datetime.now().isoformat(),
                'metadata': {
                    'is_agentic': is_agentic,
                    'action_result': action_result if action_result else {},
                    'context_info': context_info if context_info else {}
                }
            }

            if conversation_id:
                conv_ref = db.collection('users').document(user_id).collection('conversations').document(conversation_id)
                conv_ref.update({
                    'messages': firestore.ArrayUnion([message_data, ai_message_data]),
                    'updated_at': datetime.now().isoformat()
                })
            else:
                new_conv_ref = db.collection('users').document(user_id).collection('conversations').document()
                conversation_id = new_conv_ref.id
                new_conv_ref.set({
                    'id': conversation_id,
                    'title': user_message[:50] + ("..." if len(user_message) > 50 else ""),
                    'messages': [message_data, ai_message_data],
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat(),
                    'is_agentic': is_agentic
                })
            
            return {"conversation_id": conversation_id, "success": True}
            
        except Exception as e:
            print(f"❌ Erreur sauvegarde conversation: {e}")
            return {"conversation_id": conversation_id or "error", "success": False}
    
    
    async def _detect_agentic_intention(self, message: str) -> Dict:
        """Détection d'intention agentique améliorée"""
        message_lower = message.lower()
        
        # Patterns plus précis
        patterns = {
            "web_search": {
                "keywords": ["recherche", "cherche", "trouve", "informations", "actualités", 
                            "nouvelles", "avancées", "tendances", "derniers", "mise à jour",
                            "quelle est la", "qu'est-ce que", "définition de"],
                "patterns": [r"recherche.*sur", r"cherche.*info", r"trouve.*sur", 
                            r"actualités.*ia", r"mise à jour.*2025",r"mise à jour.*2026"]
            },
            "code_generation": {
                "keywords": ["code", "programme", "python", "javascript", "html", "génère", 
                            "écris", "script", "fonction", "algorithme", "boucle", "variable"],
                "patterns": [r"génère.*code", r"écris.*programme", r"code.*pour", 
                            r"python.*pour", r"fonction.*python"]
            },
            "document_processing": {
                "keywords": ["résume", "synthèse", "synthétise", "extrait", "points clés",
                            "récapitule", "résumé", "synopsis", "abstract"],
                "patterns": [r"résume.*document", r"synthèse.*pour", r"points clés.*pour"]
            },
            "data_analysis": {
                "keywords": ["analyse", "data", "données", "statistiques", "graphique", 
                            "tableau", "comparaison", "chiffres", "pourcentage", "statistique"],
                "patterns": [r"analyse.*données", r"stats.*sur", r"graphique.*pour"]
            }
        }
        
        # Détection avec scoring
        best_match = {"is_agentic": False, "confidence": 0.0}
        
        for action_type, config in patterns.items():
            # Score basé sur les keywords
            keyword_matches = [kw for kw in config["keywords"] if kw in message_lower]
            keyword_score = len(keyword_matches) * 0.2
            
            # Score basé sur les patterns regex
            pattern_score = 0
            for pattern in config["patterns"]:
                if re.search(pattern, message_lower):
                    pattern_score = 0.5
                    break
            
            total_score = keyword_score + pattern_score
            
            if total_score > best_match["confidence"]:
                best_match = {
                    "is_agentic": True,
                    "action_type": action_type,
                    "parameters": self._extract_parameters(action_type, message),
                    "confidence": min(total_score, 1.0)
                }
        
        return best_match
    
    def _extract_parameters(self, action_type: str, message: str) -> Dict:
        """Extraction des paramètres"""
        if action_type == "web_search":
            return {"query": message, "max_results": 5}
        elif action_type == "code_generation":
            return {"task": message, "language": self._detect_programming_language(message)}
        elif action_type == "document_processing":
            return {"action": "summarize", "content": message}
        return {"input": message}
    
    def _detect_programming_language(self, message: str) -> str:
        """Détection du langage de programmation"""
        message_lower = message.lower()
        if any(word in message_lower for word in ["python", "py", "pandas","LMM", "NLP", "ML", "DL"]):
            return "python"
        elif any(word in message_lower for word in ["javascript", "js", "node"]):
            return "javascript"
        elif any(word in message_lower for word in ["html", "css", "web"]):
            return "html"
        elif any(word in message_lower for word in ["java", "spring"]):
            return "java"
        elif any(word in message_lower for word in ["c"]):
            return "c"
        elif any(word in message_lower for word in ["c++"]):
            return "c++"
        elif any(word in message_lower for word in ["c#"]):
            return "c#"
        return "python"
    
    def _build_agentic_response(self, original_message: str, action_result: Dict) -> str:
        """Construit la réponse agentique"""
        action = action_result.get("action", "")
        result = action_result.get("result", {})
        
        if action == "web_search":
            if "error" in result:
                return f"🔍 **Recherche - Service temporairement limité**\n\n{result['error']}"
            
            if result.get("results"):
                results = result["results"]
                response = f"🔍 **Recherche Terminée**\n\n{len(results)} résultat(s) pour : '{result.get('query', '')}'\n\n"
                
                for i, item in enumerate(results[:3], 1):
                    response += f"**{i}. {item.get('title', 'Sans titre')}**\n"
                    content = item.get('content', '')[:200] + "..." if len(item.get('content', '')) > 200 else item.get('content', '')
                    response += f"{content}\n"
                    if item.get('source'):
                        response += f"*Source: {item['source']}*\n"
                    response += "\n"
                
                return response
            
            return f"🔍 **Recherche**\n\nAucun résultat trouvé pour '{result.get('query', '')}'"
        
        elif action == "code_generation":
            if "error" in result:
                return f"💻 **Génération de Code - Erreur**\n\n{result['error']}"
            
            return f"💻 **Code Généré**\n\n```{result.get('language', 'python')}\n{result.get('code', '')}\n```"
        
        return f"✅ **Action '{action}' exécutée**\n\n{str(result)[:500]}"
    
    async def _handle_error(self, user_id: str, message: str, conversation_id: str, error: str):
        """Gère les erreurs"""
        error_message = "Désolé, je rencontre une difficulté technique. Veuillez réessayer."
        
        conv_data = await self._save_conversation(
            user_id, message, error_message, conversation_id, 
            is_agentic=False
        )
        
        return {
            "message": error_message,
            "conversation_id": conv_data["conversation_id"],
            "actions_executed": False
        }

# Instance globale
chat_service = ChatService()

