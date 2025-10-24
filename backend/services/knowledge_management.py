# services/knowledge_management.py
from typing import Dict, List
from datetime import datetime
from google.cloud import firestore # firestore : Base de données NoSQL de Google
from core.database import db # db : l'instance de la base de données Firebase
from langchain.schema import Document  
import json
import re

class KnowledgeManager:
    def __init__(self):
        self.knowledge_graph = {} # Graphe de connaissances en mémoire
        self.learning_rate = 0.1  # Taux d'apprentissage pour l'adaptation
        self.min_value_score = 0.3  # Score minimum pour considérer une connaissance utile
    
    async def enhance_with_knowledge(self, query: str, user_id: str, action_type: str = None) -> Dict:
        """Améliore le contexte avec les connaissances existantes"""
        try:
            # 1. Recherche dans la base de connaissances utilisateur
            user_knowledge = await self._get_user_knowledge(user_id, query)
            
            # 2. Recherche dans les connaissances globales
            global_knowledge = await self._get_global_knowledge(query)
            
            # 3. Connaissances spécifiques à l'action
            action_knowledge = await self._get_action_knowledge(action_type, query) if action_type else {}
            
            # Agrégation des Connaissances
            enhanced_context = {
                "user_knowledge": user_knowledge,
                "global_knowledge": global_knowledge,
                "action_knowledge": action_knowledge,
                "has_knowledge": bool(user_knowledge or global_knowledge or action_knowledge),
                "enhancement_score": self._calculate_enhancement_score(user_knowledge, global_knowledge),
                "total_knowledge_items": len(user_knowledge) + len(global_knowledge) + len(action_knowledge)
            }
            
            return enhanced_context
            
        except Exception as e:
            print(f"❌ Erreur enhancement knowledge: {e}")
            return {"has_knowledge": False}
    
    # Méthode d'Apprentissage learn_from_interaction
    async def learn_from_interaction(self, user_id: str, question: str, result: Dict, interaction_type: str):
        """Apprentissage à partir des interactions"""
        try:
            # Filtrer les interactions intéressantes
            valuable_interactions = ["web_search", "data_analysis", "rag_conversation", "code_generation", "document_processing"]

            if interaction_type not in valuable_interactions:
                return

            # Calculer la valeur de la connaissance
            value_score = self._calculate_knowledge_value(question, result)

            # Ne stocker que les connaissances valorisables
            if value_score < self.min_value_score:
                return
                
            knowledge_entry = {
                "user_id": user_id,
                "question": question,
                "response": result.get("response", "") if isinstance(result, dict) else str(result),
                "interaction_type": interaction_type,
                "timestamp": datetime.now().isoformat(),
                "value_score": value_score,
                "last_used": None
            }
            
            # Sauvegarde en base
            await self._store_knowledge_entry(user_id, knowledge_entry)
            
            # Mise à jour du graphe de connaissances
            self._update_knowledge_graph(user_id, question, knowledge_entry)

            print(f"📚 Connaissance sauvegardée (score: {value_score:.2f})")
                
        except Exception as e:
            print(f"❌ Erreur apprentissage: {e}")
    


    async def _get_user_knowledge(self, user_id: str, query: str) -> List[Dict]:
        """Récupère les connaissances spécifiques à l'utilisateur"""
        try:
            knowledge_ref = db.collection('users').document(user_id).collection('knowledge')

            # Recherche par similarité sémantique (approximation)
            query_keywords = self._extract_keywords(query)

            docs = knowledge_ref.where(filter=firestore.FieldFilter('value_score', '>=', self.min_value_score)).stream()

            results = []
            for doc in docs:
                knowledge_data = doc.to_dict()
                
                # Vérifier la pertinence
                if self._is_relevant(knowledge_data, query, query_keywords):
                    results.append(knowledge_data)
                
                if len(results) >= 5:  # Limite de résultats
                    break
            
            return results
            
        except Exception as e:
            print(f"❌ Erreur récupération connaissances utilisateur: {e}")
            return []
    
    async def _get_global_knowledge(self, query: str) -> List[Dict]:
        """Récupère les connaissances partagées de tous les utilisateurs"""
        try:
            # Rechercher dans les connaissances de TOUS les utilisateurs
            all_knowledge_ref = db.collection_group('knowledge')
            query_keywords = self._extract_keywords(query)
            
            results = []
            
            # Filtrer seulement les connaissances de haute qualité
            docs = all_knowledge_ref.where('value_score', '>=', 0.7).limit(20).stream()
        
            for doc in docs:
                knowledge_data = doc.to_dict()
                
                # Vérifier la pertinence pour la requête actuelle
                if self._is_relevant(knowledge_data, query, query_keywords):
                    # Masquer les informations sensibles de l'utilisateur
                    anonymized_data = {
                        'question': knowledge_data.get('question'),
                        'response': knowledge_data.get('response'),
                        'value_score': knowledge_data.get('value_score'),
                        'interaction_type': knowledge_data.get('interaction_type'),
                        'usage_count': knowledge_data.get('usage_count', 0),
                        'source': 'community_knowledge',  # Source anonymisée
                        'is_global': True
                    }
                    
                    results.append(anonymized_data)
                    
                    if len(results) >= 5:  # Limiter les résultats
                        break
            
            return results
            
        except Exception as e:
            print(f"❌ Erreur récupération connaissances globales: {e}")
            return []
            
    async def _get_action_knowledge(self, action_type: str, query: str) -> Dict:
        """Récupère les connaissances spécifiques à une action"""
        try:
            # Connaissances spécifiques aux types d'actions
            action_knowledge = {
                "web_search": {
                    "description": "Recherche d'informations sur le web",
                    "best_practices": [
                        "Utiliser des termes de recherche spécifiques",
                        "Vérifier la crédibilité des sources",
                        "Croiser les informations multiples"
                    ],
                    "sources_recommended": ["Google Scholar", "arXiv", "Wikipedia"]
                },
                "code_generation": {
                    "description": "Génération de code programmatique",
                    "best_practices": [
                        "Spécifier le langage de programmation",
                        "Définir des exigences claires",
                        "Inclure des exemples de code"
                    ],
                    "languages_supported": ["Python", "JavaScript", "Java", "C++", "HTML/CSS", "PHP", "R", "C", "C++"]
                },
                "data_analysis": {
                    "description": "Analyse de données et statistiques",
                    "best_practices": [
                        "Fournir des données structurées",
                        "Préciser le type d'analyse souhaitée",
                        "Inclure des métadonnées contextuelles"
                    ],
                    "analysis_types": ["descriptive", "predictive", "prescriptive"]
                }
            }
            
            return action_knowledge.get(action_type, {})
            
        except Exception as e:
            print(f"❌ Erreur récupération connaissances action: {e}")
            return {}

    def _calculate_knowledge_value(self, question: str, result: Dict) -> float:
        """Calcule la valeur de la connaissance"""
        try:
            # Basé sur la longueur, la complexité, et l'utilité perçue
            response_text = result.get("response", "") if isinstance(result, dict) else str(result)
            if not response_text or len(response_text.strip()) < 50:
                return 0.0  # Réponse trop courte
            
            # Métriques de qualité
            length_score = min(len(response_text) / 1000, 1.0) # Longueur : Score basé sur la longueur de la réponse
            complexity_score = min(len(response_text.split()) / 100, 1.0) # Complexité
            structure_score = 1.0 if any(c in response_text for c in ['\n', '- ', '* ']) else 0.5

            # Score composite
            composite_score = (length_score * 0.4 + complexity_score * 0.3 + structure_score * 0.3)

            return round(composite_score, 2)
        except Exception as e:
            print(f"❌ Erreur calcul valeur connaissance: {e}")
            return 0.0
        

    def _calculate_enhancement_score(self, user_knowledge: List[Dict], global_knowledge: List[Dict]) -> float:
        """Calcule le score d'enrichissement du contexte"""
        total_items = len(user_knowledge) + len(global_knowledge)
        
        if total_items == 0:
            return 0.0
        
        # Score basé sur la quantité et la qualité des connaissances
        quality_scores = []
        
        for knowledge in user_knowledge + global_knowledge:
            quality_scores.append(knowledge.get('value_score', 0.5))
        
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0.5
        quantity_factor = min(total_items / 5, 1.0)  # Normalisé sur 5 items max
        
        return round(avg_quality * quantity_factor, 2)


    def _update_knowledge_graph(self, user_id: str, question: str, knowledge_entry: Dict):
        """Met à jour le graphe de connaissances en mémoire"""
        try:
            if user_id not in self.knowledge_graph:
                self.knowledge_graph[user_id] = {}
            
            # Extraire les concepts clés de la question
            keywords = self._extract_keywords(question)
            
            for keyword in keywords:
                if keyword not in self.knowledge_graph[user_id]:
                    self.knowledge_graph[user_id][keyword] = []
                
                # Ajouter la connaissance au graphe
                self.knowledge_graph[user_id][keyword].append({
                    "entry_id": knowledge_entry.get("question", "unknown")[:50],
                    "timestamp": datetime.now().isoformat(),
                    "value_score": knowledge_entry.get("value_score", 0.0)
                })
                
                # Garder seulement les 10 dernières entrées par mot-clé
                if len(self.knowledge_graph[user_id][keyword]) > 10:
                    self.knowledge_graph[user_id][keyword] = self.knowledge_graph[user_id][keyword][-10:]
                    
        except Exception as e:
            print(f"❌ Erreur mise à jour graphe connaissances: {e}")

    async def _store_knowledge_entry(self, user_id: str, knowledge: Dict):
        knowledge_ref = db.collection('users').document(user_id).collection('knowledge')
        entry_id = f"know_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(knowledge['question'][:10]) % 10000:04d}"
        knowledge['id'] = entry_id
        # mettre timestamp natif firestore
        knowledge['timestamp'] = firestore.SERVER_TIMESTAMP
        knowledge_ref.document(entry_id).set(knowledge)

        # INDEXER dans le vectorstore (embedding du question+response)
        try:
            from core.vectorstore import vector_store
            doc_text = knowledge.get('question', '') + "\n\n" + knowledge.get('response', '')
            doc = Document(page_content=doc_text, metadata={"source": knowledge.get("interaction_type", "user"), "user_id": user_id, "knowledge_id": entry_id})
            # init vectorstore si pas initialisé
            vector_store.init_vectorstore()
            vector_store.add_documents([doc], user_id=user_id)
        except Exception as e:
            print(f"Erreur indexation knowledge dans vectorstore: {e}")

    def _extract_keywords(self, text: str) -> List[str]:
        """Extrait les mots-clés d'un texte"""
        try:
            # Nettoyer le texte
            clean_text = re.sub(r'[^\w\s]', '', text.lower())
            words = clean_text.split()
            
            # Filtrer les stopwords simples
            stopwords = {'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'où', 'que', 'qui', 'quoi'}
            keywords = [word for word in words if word not in stopwords and len(word) > 2]
            
            return list(set(keywords))[:10]  # Maximum 10 mots-clés uniques
            
        except Exception as e:
            print(f"❌ Erreur extraction mots-clés: {e}")
            return []

    def _is_relevant(self, knowledge: Dict, query: str, query_keywords: List[str]) -> bool:
        """Détermine si une connaissance est pertinente pour une requête"""
        try:
            # Vérifier le score de valeur
            if knowledge.get('value_score', 0) < self.min_value_score:
                return False
            
            # Vérifier la similarité des mots-clés
            knowledge_question = knowledge.get('question', '').lower()
            knowledge_response = knowledge.get('response', '').lower()
            query_lower = query.lower()
            
            # Score de pertinence basé sur les mots-clés communs
            common_keywords = set(self._extract_keywords(knowledge_question)) & set(query_keywords)
            relevance_score = len(common_keywords) / max(len(query_keywords), 1)
            
            return relevance_score > 0.3  # Seuil de pertinence
            
        except Exception as e:
            print(f"❌ Erreur vérification pertinence: {e}")
            return False


    async def get_user_stats(self, user_id: str) -> Dict:
        """Retourne les statistiques de connaissances d'un utilisateur"""
        try:
            knowledge_ref = db.collection('users').document(user_id).collection('knowledge')
            
            # Compter le nombre total de documents
            all_docs = list(knowledge_ref.stream())
            knowledge_count = len(all_docs)
            
            # Compter les documents haute valeur
            high_value_docs = list(knowledge_ref.where('value_score', '>=', 0.7).stream())
            high_value_count = len(high_value_docs)
            
            # Calculer le score moyen
            total_score = 0.0
            for doc in all_docs:
                knowledge_data = doc.to_dict()
                total_score += knowledge_data.get('value_score', 0.0)
            
            avg_score = round(total_score / knowledge_count, 2) if knowledge_count > 0 else 0.0
            
            return {
                "total_knowledge": knowledge_count,
                "high_value_knowledge": high_value_count,
                "knowledge_graph_size": len(self.knowledge_graph.get(user_id, {})),
                "avg_value_score": avg_score,
                "user_id": user_id
            }
            
        except Exception as e:
            print(f"❌ Erreur statistiques utilisateur: {e}")
            return {
                "total_knowledge": 0,
                "high_value_knowledge": 0,
                "knowledge_graph_size": 0,
                "avg_value_score": 0.0,
                "error": "Impossible de calculer les statistiques"
            }

    async def get_user_knowledge(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Récupère les connaissances d'un utilisateur avec limite"""
        try:
            knowledge_ref = db.collection('users').document(user_id).collection('knowledge')
            
            # Trier par date décroissante et limiter
            query_ref = knowledge_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
            docs = query_ref.stream()
            
            results = []
            for doc in docs:
                knowledge_data = doc.to_dict()
                results.append(knowledge_data)
            
            return results
            
        except Exception as e:
            print(f"❌ Erreur récupération connaissances utilisateur: {e}")
            return []

    async def _calculate_avg_value_score(self, user_id: str) -> float:
        """Calcule le score de valeur moyen des connaissances"""
        try:
            knowledge_ref = db.collection('users').document(user_id).collection('knowledge')
            docs = knowledge_ref.stream()
            
            scores = []
            for doc in docs:
                knowledge_data = doc.to_dict()
                scores.append(knowledge_data.get('value_score', 0.0))
            
            return round(sum(scores) / len(scores), 2) if scores else 0.0
            
        except Exception as e:
            print(f"❌ Erreur calcul score moyen: {e}")
            return 0.0


# Instance globale
knowledge_manager = KnowledgeManager()
