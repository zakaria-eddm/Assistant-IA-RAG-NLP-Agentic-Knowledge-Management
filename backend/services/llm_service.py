# services/llm_service.py
from openai import OpenAI # Client pour les APIs compatibles OpenAI (comme Groq)
import os
import requests
import asyncio
from core.config import settings
from functools import lru_cache


class LLMService:
    def __init__(self):
        self.available_models = {
            "groq": [
                "openai/gpt-oss-20b",
                "deepseek-r1-distill-llama-70b", 
                "meta-llama/llama-4-maverick-17b-128e-instruct",
                "llama-3.1-8b-instant",
                "llama-3.3-70b-versatile",
                "gemma2-9b-it",
                "qwen/qwen3-32b"
                ]
        }
    
    async def get_response(self, messages: list) -> str:
        try:
            return await self._call_groq(messages)
        except Exception as e:
            logger.error(f"Erreur LLM: {e}")
            # return self._call_fallback(messages)
            return await asyncio.to_thread(self._call_fallback, messages)
            
    def _call_groq_sync(self, messages: list) -> str:
        try:
            client = OpenAI(api_key=settings.GROQ_API_KEY, base_url=settings.GROQ_API_URL)
            model = self._select_optimal_model(messages)

            print(f"🎯 Utilisation du modèle: {model}")

            response = client.chat.completions.create(
                model=model, messages=messages, stream=False, temperature=0.7, max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"Erreur Groq API: {e}")

    async def _call_groq(self, messages: list) -> str:
        return await asyncio.to_thread(self._call_groq_sync, messages)

    # def _call_groq(self, messages: list) -> str:
    #     """Utilise l'API Groq avec sélection intelligente du modèle"""
    #     try:
    #         client = OpenAI(
    #             api_key=settings.GROQ_API_KEY,
    #             base_url=settings.GROQ_API_URL
    #         )
            
    #         # Sélection intelligente du modèle basée sur le contexte
    #         model = self._select_optimal_model(messages)
            
    #         print(f"Utilisation du modèle: {model}")
            
    #         response = client.chat.completions.create(
    #             model=model,
    #             messages=messages,
    #             stream=False,
    #             temperature=0.7,
    #             max_tokens=2000
    #         )
    #         return response.choices[0].message.content
        
    #     except Exception as e:
    #         raise Exception(f"Erreur Groq API: {e}")

    def _call_fallback(self, messages: str) -> str:
        """Réponse de fallback si tout échoue"""
        return """🤖 Assistant IA en mode dégradé

Désolé, le service IA principal est temporairement indisponible.

Pour résoudre :
1. Vérifiez votre compte Groq : https://console.groq.com

En attendant, voici une réponse générale sur l'IA :

L'intelligence artificielle est un domaine de l'informatique qui crée des systèmes capables d'apprendre, de raisonner et de résoudre des problèmes comme un humain."""


    def _select_optimal_model(self, messages: list) -> str:
        """Sélectionne le modèle optimal basé sur le contexte"""
        last_message = messages[-1]["content"] if messages else ""
        last_message_lower = last_message.lower()
        
        # Classification des modèles par catégorie et performance
        models = {
            # Modèles rapides (8-20B) - Réponses instantanées
            "fast": {
                "model": "llama-3.1-8b-instant",
                "tokens": 8192,
                "speed": "très rapide",
                "use_case": "conversations courantes, réponses simples"
            },
            
            # Modèles équilibrés (17-32B) - Bonnes performances
            "balanced": {
                "model": "meta-llama/llama-4-maverick-17b-128e-instruct", 
                "tokens": 128000,
                "speed": "rapide",
                "use_case": "tâches générales, analyse modérée"
            },
            
            # Modèles techniques (32B) - Expert code/technique
            "technical": {
                "model": "qwen/qwen3-32b",
                "tokens": 32768, 
                "speed": "moyen",
                "use_case": "code, documentation technique, raisonnement"
            },
            
            # Modèles puissants (70B) - Analyse approfondie
            "powerful": {
                "model": "llama-3.3-70b-versatile",
                "tokens": 8192,
                "speed": "modéré",
                "use_case": "recherche, analyse complexe, contenu détaillé"
            },
            
            # Modèles spécialisés (70B) - Domaines spécifiques
            "specialized": {
                "model": "deepseek-r1-distill-llama-70b",
                "tokens": 32768,
                "speed": "modéré", 
                "use_case": "raisonnement, tâches spécialisées, connaissances approfondies"
            },
            
            # Modèles multilingues (20B) - Langues multiples
            "multilingual": {
                "model": "openai/gpt-oss-20b",
                "tokens": 8192,
                "speed": "rapide",
                "use_case": "multilingue, traitement multiple langues"
            },
            
            
            # Modèles efficaces (9B) - Léger et performant
            "efficient": {
                "model": "gemma2-9b-it",
                "tokens": 8192,
                "speed": "très rapide",
                "use_case": "réponses concises, traitement léger"
            }
        }
        
        # # Détection du type de requête pour sélection optimale
        # if any(word in last_message_lower for word in ["code", "program", "script", "python", "javascript", "java", "c++", "html", "css", "algorithm"]):
        #     return models["technical"]["model"]  # qwen/qwen3-32b
        
        # if any(word in last_message_lower for word in ["recherche", "analyse", "détaillé", "complet", "complexe", "étude", "rapport"]):
        #     return models["powerful"]["model"]  # llama-3.3-70b-versatile
        
        # if any(word in last_message_lower for word in ["raisonnement", "logique", "problème", "solution", "stratégie"]):
        #     return models["specialized"]["model"]  # deepseek-r1-distill-llama-70b
        
        # if any(word in last_message_lower for word in ["anglais", "english", "español", "français", "deutsch", "multilingue", "traduction"]):
        #     return models["multilingual"]["model"]  # openai/gpt-oss-20b
        
        # if len(last_message) > 1000:  # Requêtes très longues
        #     return models["balanced"]["model"]  # meta-llama/llama-4-maverick-17b-128e-instruct
        
        # if len(last_message) > 300:  # Requêtes moyennes
        #     return models["balanced"]["model"]  # meta-llama/llama-4-maverick-17b-128e-instruct
        
        # Par défaut: modèle rapide pour conversations courantes
        return models["fast"]["model"]  # llama-3.1-8b-instant
    

    @lru_cache(maxsize=1000)
    def _get_embeddings(self, text: str):
        return self.embeddings.embed_query(text)

    # Tester la Connexion
    def test_connection(self):
        """Teste la connexion à l'API Groq"""
        try:
            test_messages = [{"role": "user", "content": "Test de connexion. Réponds par 'OK' si tu fonctionnes."}]
            response = self.get_response(test_messages)
            print(f"✅ Test LLM réussi: {response}")
            return True
        except Exception as e:
            print(f"❌ Test LLM échoué: {e}")
            return False
# Instance globale
llm_service = LLMService()

