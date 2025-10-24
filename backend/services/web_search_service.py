# services/web_search_service.py
import asyncio
import httpx
import re
import html
from typing import List, Dict, Optional
from urllib.parse import urlparse, quote_plus


class WebSearchService:
    def __init__(self):
        self.timeout = httpx.Timeout(20.0)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
            "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr,en;q=0.8",
        }
            
    async def search_with_fallback(self, query: str, max_results: int = 5) -> Dict:
        print(f"Recherche optimisée: '{query}' (max {max_results})")
        results = []

        # Ordre des sources avec priorités
        sources = [
            self._search_duckduckgo_lite,
            self._search_wikipedia,
            self._search_searxng,
            # self._search_google_programmable  # Décommentez si configuré
        ]

        for source in sources:
            try:
                part = await source(query, max_results)
                if part:
                    results.extend(part)
                    print(f"✅ {source.__name__}: {len(part)} résultats")
                    if len(results) >= max_results:
                        break
            except Exception as e:
                print(f"❌ Erreur {source.__name__}: {e}")

        if not results:
            print("❌ Aucun résultat trouvé, utilisation du fallback LLM")
            return {
                "query": query,
                "results": [],
                "result_count": 0,
                "status": "no_results",
                "has_web_results": False,
            }

        return {
            "query": query,
            "results": results[:max_results],
            "result_count": len(results[:max_results]),
            "status": "success",
            "has_web_results": True,
        }

    # ---------------- DuckDuckGo ----------------
    async def _search_duckduckgo_lite(self, query: str, max_results: int) -> List[Dict]:
        url = "https://api.duckduckgo.com/"
        params = {
            "q": query,
            "format": "json",
            "no_html": "1",
            "no_redirect": "1",
        }

        async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
            for attempt, delay in enumerate([1, 3, 6], 1):
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    try:
                        data = resp.json()
                        return self._parse_duckduckgo(data, max_results)
                    except Exception as e:
                        print(f"DuckDuckGo JSON error: {e}")
                        return []
                elif resp.status_code == 202:
                    print(f"DuckDuckGo retry {attempt}/3 après {delay}s")
                    await asyncio.sleep(delay)
                else:
                    print(f"DuckDuckGo status {resp.status_code}")
                    break
        return []

    def _parse_duckduckgo(self, data: dict, max_results: int) -> List[Dict]:
        results = []

        if data.get("AbstractText"):
            results.append({
                "title": data.get("Heading", "Résumé"),
                "content": self._clean_text(data["AbstractText"]),
                "url": data.get("AbstractURL", ""),
                "source": "duckduckgo",
                "domain": self._extract_domain(data.get("AbstractURL", "")),
                "confidence": 0.9,
            })

        for topic in data.get("RelatedTopics", []):
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title": topic["Text"][:80],
                    "content": self._clean_text(topic["Text"]),
                    "url": topic.get("FirstURL", ""),
                    "source": "duckduckgo",
                    "domain": self._extract_domain(topic.get("FirstURL", "")),
                    "confidence": 0.7,
                })
            elif isinstance(topic, dict) and "Topics" in topic:
                for sub in topic["Topics"]:
                    if isinstance(sub, dict) and sub.get("Text"):
                        results.append({
                            "title": sub["Text"][:80],
                            "content": self._clean_text(sub["Text"]),
                            "url": sub.get("FirstURL", ""),
                            "source": "duckduckgo",
                            "domain": self._extract_domain(sub.get("FirstURL", "")),
                            "confidence": 0.65,
                        })
        return results[:max_results]

    # ---------------- Wikipedia ----------------
    async def _search_wikipedia(self, query: str, max_results: int) -> List[Dict]:
        results = []
        async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
            for lang in ["fr", "en"]:
                params = {
                    "action": "query",
                    "list": "search",
                    "srsearch": query,
                    "format": "json",
                    "utf8": 1,
                    "srlimit": max_results,
                }
                resp = await client.get(f"https://{lang}.wikipedia.org/w/api.php", params=params)
                if resp.status_code != 200:
                    continue

                if "application/json" not in resp.headers.get("Content-Type", ""):
                    print(f"Wikipedia {lang} n’a pas renvoyé du JSON")
                    continue

                data = resp.json()
                for item in data.get("query", {}).get("search", []):
                    results.append({
                        "title": item.get("title", ""),
                        "content": self._clean_text(item.get("snippet", "")),
                        "url": f"https://{lang}.wikipedia.org/wiki/{quote_plus(item.get('title', '').replace(' ', '_'))}",
                        "source": f"wikipedia_{lang}",
                        "domain": "wikipedia.org",
                        "confidence": 0.8,
                    })
                if results:
                    break
        return results[:max_results]

    # ---------------- SearXNG ----------------


    async def _search_searxng(self, query: str, max_results: int) -> List[Dict]:
        """Recherche via SearXNG avec meilleure gestion d'erreurs"""
        instances = [
            "https://search.disroot.org",
            "https://searx.tiekoetter.com",
            "https://searxng.nicfab.eu",
            "https://searx.be",  # Nouvelle instance
            "https://search.us.projectsegfau.lt",  # Nouvelle instance
        ]
        
        for instance in instances:
            try:
                async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                    # Essayer d'abord le endpoint standard
                    try:
                        resp = await client.get(f"{instance}/search", params={
                            "q": query,
                            "format": "json",
                            "language": "fr",
                            "safesearch": 0,
                        })
                    except httpx.ConnectError:
                        # Si échec, essayer sans /search
                        resp = await client.get(instance, params={
                            "q": query,
                            "format": "json",
                            "language": "fr",
                            "safesearch": 0,
                        })
                    
                    if resp.status_code != 200:
                        print(f"{instance} status {resp.status_code}")
                        continue
                    
                    content_type = resp.headers.get("Content-Type", "").lower()
                    if "application/json" not in content_type:
                        print(f" {instance} pas JSON - Content-Type: {content_type}")
                        # Essayer de parser quand même
                        try:
                            data = resp.json()
                        except:
                            continue
                    else:
                        data = resp.json()

                    results = []
                    for item in data.get("results", [])[:max_results]:
                        if not item.get("title") or not item.get("content"):
                            continue
                        results.append({
                            "title": self._clean_text(item["title"]),
                            "content": self._clean_text(item["content"]),
                            "url": item.get("url", ""),
                            "source": "searxng",
                            "domain": self._extract_domain(item.get("url", "")),
                            "confidence": 0.75,
                        })
                    if results:
                        return results
            except Exception as e:
                print(f"❌ Erreur {instance}: {e}")
                continue
        return []
 
    # ---------------- Utils ----------------
    def _clean_text(self, text: str) -> str:
        text = html.unescape(text or "")
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _extract_domain(self, url: str) -> str:
        try:
            return urlparse(url).netloc
        except:
            return "inconnu"


# Instance globale
web_search_service = WebSearchService()
