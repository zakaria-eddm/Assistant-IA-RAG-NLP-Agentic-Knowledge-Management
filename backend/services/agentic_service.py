# services/agentic_service.py 
from typing import List, Dict, Any, Optional
import json
import requests
from datetime import datetime
import asyncio
from google.cloud import firestore
from core.database import db
from services.llm_service import llm_service
from services.web_search_service import web_search_service 
import httpx
import time

class AgenticService:
    def __init__(self):
        self.available_actions = {
            "web_search": self.web_search,
            "data_analysis": self.analyze_data,
            "document_processing": self.process_documents,
            "code_generation": self.generate_code,
            "knowledge_update": self.update_knowledge,
            "summary_generation": self.generate_summary
        }
        
        self.action_descriptions = {
            "web_search": "Recherche d'informations sur le web",
            "data_analysis": "Analyse de données et génération d'insights",
            "document_processing": "Traitement et extraction d'informations de documents",
            "code_generation": "Génération de code dans différents langages",
            "knowledge_update": "Mise à jour de la base de connaissances",
            "summary_generation": "Génération de résumés et synthèses"
        }
    
    async def execute_action(self, action_name: str, parameters: Dict, user_id: str) -> Dict:
        """Exécute une action agentique"""
        if action_name not in self.available_actions:
            return {"error": f"Action non supportée: {action_name}"}
        
        try:
            result = await self.available_actions[action_name](parameters, user_id)

             # Enrichir la base de connaissances avec les résultats de l'action
            if action_name in ["web_search", "data_analysis", "document_processing"]:
                await self.enrich_knowledge_from_action(action_name, parameters, user_id, result)

            return {
                "action": action_name,
                "parameters": parameters,
                "result": result,
                "timestamp": datetime.now().isoformat(),
                "status": "success"
            }
        except Exception as e:
            return {
                "action": action_name,
                "parameters": parameters,
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "status": "error"
            }


    async def web_search(self, params: Dict, user_id: str) -> Dict:
        """Recherche web avec le nouveau service optimisé"""
        query = params.get("query", "")
        max_results = params.get("max_results", 8)
        
        # Nettoyer et optimiser la requête
        query = self._optimize_search_query(query)
        
        if not query.strip():
            return {
                "error": "Requête de recherche vide",
                "query": query,
                "results": [],
                "result_count": 0
            }
        
        print(f"🔍 Recherche web optimisée: '{query}'")
        
        try:
            # Utiliser le service de recherche amélioré
            search_result = await web_search_service.search_with_fallback(query, max_results)
            
            if search_result.get("has_web_results", False):
                results = search_result["results"]
                print(f"✅ Recherche réussie: {len(results)} résultats")
                
                # Formater pour l'affichage
                return {
                    "query": query,
                    "results": results,
                    "result_count": len(results),
                    "sources_used": search_result.get("sources_used", []),
                    "source": "web_search_success",
                    "status": "success"
                }
            else:
                # Fallback vers LLM avec contexte amélioré
                print("⚠️ Pas de résultats web, utilisation du fallback LLM")
                return await self._enhanced_llm_fallback(query)
                
        except Exception as e:
            print(f"❌ Erreur recherche web: {e}")
            return await self._enhanced_llm_fallback(query)

    def _optimize_search_query(self, query: str) -> str:
        """Optimise la requête de recherche pour de meilleurs résultats"""
        # Supprimer les mots superflus
        stop_words = [
            "rechercher", "chercher", "trouver", "donner", "montrer", 
            "sur", "des", "du", "de", "la", "le", "les", "un", "une",
            "pour", "afin", "dans", "avec", "sans"
        ]
        
        # Nettoyer la requête
        words = query.lower().split()
        filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
        
        # Reformuler la requête
        optimized_query = " ".join(filtered_words)
        
        # Cas spécifiques pour les recherches temporelles
        if "2025" in query:
            # Pour les recherches temporelles, garder l'année
            optimized_query = optimized_query.replace("2025", "") + " 2025"
        
        return optimized_query.strip()


    # async def web_search(self, params: Dict, user_id: str) -> Dict:
    #     """Recherche web avec le nouveau service optimisé"""
    #     query = params.get("query", "")
    #     max_results = params.get("max_results", 5)
        
    #     if not query.strip():
    #         return {
    #             "error": "Requête de recherche vide",
    #             "query": query,
    #             "results": [],
    #             "result_count": 0
    #         }
        
    #     print(f"🔍 Recherche web demandée: '{query}'")
        
    #     try:
    #         # Utiliser le service de recherche amélioré
    #         search_result = await web_search_service.search_with_fallback(query, max_results)
            
    #         if search_result.get("has_web_results", False):
    #             results = search_result["results"]
    #             print(f"✅ Recherche réussie: {len(results)} résultats")
                
    #             # Formater pour l'affichage
    #             return {
    #                 "query": query,
    #                 "results": results,
    #                 "result_count": len(results),
    #                 "sources_used": search_result.get("sources_used", []),
    #                 "source": "web_search_success",
    #                 "status": "success"
    #             }
    #         else:
    #             # Fallback vers LLM avec contexte amélioré
    #             print("⚠️ Pas de résultats web, utilisation du fallback LLM")
    #             return await self._enhanced_llm_fallback(query)
                
    #     except Exception as e:
    #         print(f"❌ Erreur recherche web: {e}")
    #         return await self._enhanced_llm_fallback(query)

    async def _enhanced_llm_fallback(self, query: str) -> Dict:
        """Fallback LLM amélioré avec prompt contextuel"""
        try:
            # Analyser la requête pour adapter le prompt
            is_recent_query = any(year in query for year in ["2024", "2025", "2026"])
            is_tech_query = any(word in query.lower() for word in ["llm", "ai", "ia", "intelligence artificielle", "modèle", "algorithme"])
            
            # Prompt adaptatif selon le type de requête
            if is_recent_query and is_tech_query:
                enhanced_prompt = f"""
    Vous êtes un expert en IA et technologies récentes. L'utilisateur demande : "{query}"

    Cette question concerne des informations potentiellement très récentes. Voici ce que je peux vous dire :

    CONTEXTE TEMPOREL : Mes données s'arrêtent en janvier 2025, mais je peux vous aider avec :

    1. **Tendances observées jusqu'en janvier 2025**
    2. **Projections basées sur les développements récents**
    3. **Orientations de recherche prometteuses**

    Pour les LLM open source spécifiquement, voici les développements notables jusqu'à ma date de coupure :

    • **Llama 3.x** : Continuation de la série Meta avec des améliorations significatives
    • **Mistral** : Modèles français performants avec versions 7B et plus
    • **Gemma** : Famille de modèles Google ouverts
    • **Qwen** : Modèles multilingues d'Alibaba
    • **DeepSeek** : Modèles spécialisés en raisonnement et code

    **TENDANCES 2025 OBSERVÉES** :
    - Optimisation des modèles pour l'efficacité (moins de paramètres, même performance)
    - Spécialisation par domaine (code, science, multimodal)
    - Amélioration des capacités multilingues
    - Focus sur la transparence et l'explicabilité

    **POUR LES INFORMATIONS LES PLUS RÉCENTES**, je recommande de consulter :
    - Hugging Face Model Hub
    - Papers With Code
    - ArXiv pour les publications récentes
    - GitHub des projets open source

    Répondez-moi si vous voulez des détails sur un aspect particulier.
    """
            else:
                enhanced_prompt = f"""
    Vous êtes un assistant IA spécialisé. L'utilisateur pose cette question : "{query}"

    Bien que mes données s'arrêtent en janvier 2025, je peux vous fournir :

    1. **Informations factuelles** disponibles jusqu'à cette date
    2. **Analyse des tendances** observées
    3. **Recommandations** pour obtenir les informations les plus récentes
    4. **Contexte général** sur le sujet

    Voici ma réponse détaillée sur votre question :
    """

            # Appel au LLM avec le prompt amélioré
            llm_response = await llm_service.get_response([
                {"role": "user", "content": enhanced_prompt}
            ])
            
            return {
                "query": query,
                "results": [{
                    "title": f"Réponse experte sur : {query}",
                    "content": llm_response,
                    "source": "llm_enhanced_fallback",
                    "note": "Réponse basée sur les connaissances IA (données jusqu'en janvier 2025) avec suggestions pour informations récentes",
                    "type": "enhanced_response"
                }],
                "result_count": 1,
                "source": "llm_enhanced_fallback",
                "status": "fallback_enhanced",
                "recommendation": "Pour les informations les plus récentes, consultez les sources spécialisées mentionnées dans la réponse."
            }
            
        except Exception as e:
            print(f"❌ Erreur fallback LLM: {e}")
            return {
                "query": query,
                "results": [{
                    "title": "Service temporairement indisponible",
                    "content": "Les services de recherche et l'assistant IA rencontrent des difficultés techniques. Veuillez réessayer dans quelques instants.",
                    "source": "error_fallback",
                }],
                "result_count": 1,
                "source": "error",
                "status": "error"
            }

    async def enrich_knowledge_from_action(self, action_name: str, params: Dict, user_id: str, results: Dict):
        """Enrichit la base de connaissances à partir des résultats d'une action agentique"""
        try:
            if action_name == "web_search" and results.get("results"):
                # Convertir les résultats en format document
                documents = []
                for result in results["results"]:
                    content = f"Titre: {result.get('title', '')}\n\nContenu: {result.get('content', '')}"
                    
                    document = {
                        "page_content": content,
                        "metadata": {
                            "source": result.get("source", "web_search"),
                            "url": result.get("url", ""),
                            "query": results.get("query", ""),
                            "added_via": "agentic_action",
                            "user_id": user_id,
                            "action": action_name,
                        }
                    }
                    documents.append(document)
                
                # Utiliser le service d'enrichissement pour ajouter à la base
                if documents:
                    from langchain.schema import Document
                    langchain_docs = [
                        Document(page_content=doc["page_content"], metadata=doc["metadata"])
                        for doc in documents
                    ]
                    
                    # Ajouter à la base vectorielle
                    from core.vectorstore import vector_store
                    added_count = vector_store.add_documents(
                        langchain_docs, 
                        user_id=user_id
                    )
                    print(f"✅ {added_count} documents ajoutés à la base via action agentique")

                    return added_count
                    
        except Exception as e:
            print(f"❌ Erreur enrichissement depuis action agentique: {e}")
        
        return 0


    # Reste des méthodes inchangées...
    async def analyze_data(self, params: Dict, user_id: str) -> Dict:
        """Analyse de données améliorée"""
        data = params.get("data", {})
        analysis_type = params.get("analysis_type", "summary")
        data_provided = params.get("data_provided", True)
        
        try:
            if not data_provided or not data:
                return {
                    "error": "Aucune donnée fournie pour l'analyse",
                    "data_provided": False,
                    "suggestion": "Veuillez fournir des données à analyser. Exemple: 'Analyse ces chiffres: 10, 20, 30, 40'"
                }
            
            if analysis_type == "numeric" and isinstance(data, list):
                # Analyse numérique basique
                numbers = [float(x) for x in data if str(x).isdigit()]
                if numbers:
                    return {
                        "count": len(numbers),
                        "sum": sum(numbers),
                        "average": sum(numbers) / len(numbers),
                        "min": min(numbers),
                        "max": max(numbers),
                        "type": "numeric_analysis",
                        "data_provided": True
                    }
            
            elif analysis_type == "text":
                # Analyse textuelle basique
                if isinstance(data, str):
                    words = data.split()
                    return {
                        "word_count": len(words),
                        "character_count": len(data),
                        "type": "text_analysis",
                        "data_provided": True
                    }
            
            return {
                "error": "Type d'analyse non supporté ou données invalides",
                "data_received": str(data)[:100],
                "analysis_type": analysis_type,
                "data_provided": True
            }
                
        except Exception as e:
            return {"error": f"Erreur analyse données: {str(e)}", "data_provided": data_provided}

    
    async def process_documents(self, params: Dict, user_id: str) -> Dict:
        """Traitement de documents avancé"""
        from services.rag_service import rag_service
        
        action = params.get("action", "summarize")
        content = params.get("content", "")
        
        try:
            if action == "summarize":
                # Utiliser le LLM pour résumer
                prompt = f"Résumez ce document de manière concise et informative:\n\n{content}"
                summary = await llm_service.get_response([{"role": "user", "content": prompt}])
                
                return {
                    "action": "summarize",
                    "original_length": len(content),
                    "summary": summary,
                    "summary_length": len(summary)
                }
            
            elif action == "extract_keypoints":
                prompt = f"Extrayez les points clés de ce document sous forme de liste:\n\n{content}"
                keypoints = await llm_service.get_response([{"role": "user", "content": prompt}])
                
                return {
                    "action": "extract_keypoints",
                    "keypoints": keypoints
                }
            
            return {"error": "Action de document non supportée"}
            
        except Exception as e:
            return {"error": f"Erreur traitement document: {str(e)}"}
    
    async def generate_code(self, params: Dict, user_id: str) -> Dict:
        """Génération de code"""
        language = params.get("language", "python")
        task = params.get("task", "")
        requirements = params.get("requirements", "")
        
        try:
            prompt = f"""
            Génère du code {language} pour: {task}
            Exigences: {requirements}
            
            Fournis le code complet avec des commentaires explicites.
            """
            
            code = await llm_service.get_response([{"role": "user", "content": prompt}])
            
            return {
                "language": language,
                "task": task,
                "code": code,
                "code_length": len(code)
            }
            
        except Exception as e:
            return {"error": f"Erreur génération code: {str(e)}"}
    
    async def update_knowledge(self, params: Dict, user_id: str) -> Dict:
        """Mise à jour de la base de connaissances"""
        from services.rag_service import rag_service
        
        text = params.get("text", "")
        source = params.get("source", "agentic_update")
        
        try:
            if text:
                added_count = rag_service.add_knowledge_documents(
                    texts=[text],
                    metadata=[{"source": source, "type": "agentic_update"}],
                    user_id=user_id
                )
                
                return {
                    "action": "knowledge_update",
                    "chunks_added": added_count,
                    "source": source
                }
            
            return {"error": "Aucun texte fourni pour la mise à jour"}
            
        except Exception as e:
            return {"error": f"Erreur mise à jour connaissances: {str(e)}"}
    
    async def generate_summary(self, params: Dict, user_id: str) -> Dict:
        """Génération de résumé de conversation"""
        conversation_id = params.get("conversation_id", "")
        
        try:
            if conversation_id:
                # Récupérer la conversation
                conv_ref = db.collection('users').document(user_id).collection('conversations').document(conversation_id)
                conversation = conv_ref.get()
                
                if conversation.exists:
                    conv_data = conversation.to_dict()
                    messages = conv_data.get('messages', [])
                    
                    # Préparer le contenu à résumer
                    content = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
                    
                    prompt = f"""
                    Résumez cette conversation en mettant en évidence:
                    1. Les questions principales posées
                    2. Les réponses importantes
                    3. Les conclusions ou actions à prendre
                    
                    Conversation:
                    {content}
                    """
                    
                    summary = await llm_service.get_response([{"role": "user", "content": prompt}])
                    
                    return {
                        "conversation_id": conversation_id,
                        "message_count": len(messages),
                        "summary": summary
                    }
            
            return {"error": "Conversation non trouvée"}
            
        except Exception as e:
            return {"error": f"Erreur génération résumé: {str(e)}"}
    
    def get_available_actions(self) -> List[Dict]:
        """Retourne la liste des actions disponibles"""
        return [
            {
                "name": name,
                "description": desc,
                "parameters": self._get_action_parameters(name)
            }
            for name, desc in self.action_descriptions.items()
        ]
    
    def _get_action_parameters(self, action_name: str) -> List[Dict]:
        """Retourne les paramètres requis pour chaque action"""
        parameters = {
            "web_search": [
                {"name": "query", "type": "string", "required": True, "description": "Termes de recherche"},
                {"name": "max_results", "type": "integer", "required": False, "description": "Nombre max de résultats"}
            ],
            "data_analysis": [
                {"name": "data", "type": "object", "required": True, "description": "Données à analyser"},
                {"name": "analysis_type", "type": "string", "required": False, "description": "Type d'analyse"}
            ],
            "document_processing": [
                {"name": "action", "type": "string", "required": True, "description": "Action (summarize, extract_keypoints)"},
                {"name": "content", "type": "string", "required": True, "description": "Contenu du document"}
            ],
            "code_generation": [
                {"name": "language", "type": "string", "required": True, "description": "Langage de programmation"},
                {"name": "task", "type": "string", "required": True, "description": "Description de la tâche"},
                {"name": "requirements", "type": "string", "required": False, "description": "Exigences supplémentaires"}
            ],
            "knowledge_update": [
                {"name": "text", "type": "string", "required": True, "description": "Texte à ajouter"},
                {"name": "source", "type": "string", "required": False, "description": "Source de l'information"}
            ],
            "summary_generation": [
                {"name": "conversation_id", "type": "string", "required": True, "description": "ID de la conversation"}
            ]
        }
        
        return parameters.get(action_name, [])

# Instance globale
agentic_service = AgenticService()
