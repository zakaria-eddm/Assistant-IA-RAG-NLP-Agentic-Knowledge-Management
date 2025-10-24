# core/vectorstore.py
import os
import pickle
from typing import List
from datetime import datetime
import faiss
import numpy as np

# LangChain imports
from langchain.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from langchain.docstore.in_memory import InMemoryDocstore  

# Path config
DEFAULT_PERSIST_DIR = "./faiss_db"

class VectorStoreManager:
    def __init__(self, persist_directory: str = None):
        self.persist_directory = persist_directory or DEFAULT_PERSIST_DIR
        self.embeddings = None
        self.text_splitter = None
        self.vectorstore = None
        self._initialized = False

    def _init_embeddings_and_splitter(self):
        if self.embeddings is None:
            # Instanciation protégée (try/except) pour éviter crash si hors-ligne
            try:
                self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
            except Exception as e:
                print(f"Erreur initialisation embeddings: {e}")
                raise
        if self.text_splitter is None:
            self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200, length_function=len)

    def init_vectorstore(self):
        """Initialisation lazy - appeler depuis lifespan de FastAPI"""
        if self._initialized:
            return

        self._init_embeddings_and_splitter()
        os.makedirs(self.persist_directory, exist_ok=True)

        index_path = os.path.join(self.persist_directory, "faiss_index")
        metadata_path = os.path.join(self.persist_directory, "metadata.pkl")

        # Si index existe, tenter de charger en mode safe
        if os.path.exists(index_path) and os.path.exists(metadata_path):
            try:
                index = faiss.read_index(index_path)
                with open(metadata_path, "rb") as f:
                    stored_metadatas = pickle.load(f)

                documents = []
                for i, metadata in enumerate(stored_metadatas):
                    doc = Document(page_content=metadata.get("page_content", f"Document {i}"), metadata=metadata)
                    documents.append(doc)

                docstore = InMemoryDocstore({str(i): doc for i, doc in enumerate(documents)})
                index_to_docstore_id = {i: str(i) for i in range(len(documents))}

                self.vectorstore = FAISS(
                    embedding_function=self.embeddings,
                    index=index,
                    docstore=docstore,
                    index_to_docstore_id=index_to_docstore_id
                )
                print("✅ Vector store FAISS chargé")
            except Exception as e:
                print(f"❌ Erreur chargement FAISS: {e} - création nouveau store")
                self.vectorstore = self._create_new_vectorstore()
        else:
            self.vectorstore = self._create_new_vectorstore()

        self._initialized = True

    def _create_new_vectorstore(self):
        self._init_embeddings_and_splitter()
        # Document initial minimal
        return FAISS.from_texts(
            ["Document initial de l'assistant IA."],
            self.embeddings,
            metadatas=[{"source": "system", "user_id": "system", "type": "initial", "page_content": "Document initial"}]
        )

    def save_vectorstore(self):
        """Sauvegarde atomique du index + métadonnées"""
        try:
            if not self.vectorstore:
                return

            tmp_index = os.path.join(self.persist_directory, "faiss_index.tmp")
            final_index = os.path.join(self.persist_directory, "faiss_index")
            tmp_meta = os.path.join(self.persist_directory, "metadata.pkl.tmp")
            final_meta = os.path.join(self.persist_directory, "metadata.pkl")

            # write index to tmp then rename
            faiss.write_index(self.vectorstore.index, tmp_index)
            os.replace(tmp_index, final_index)

            # sérialiser metadatas defensivement
            metadatas = []
            for doc_id in list(self.vectorstore.index_to_docstore_id.values()):
                try:
                    doc = self.vectorstore.docstore.search(doc_id)
                    # assurer format serializable
                    meta = doc.metadata.copy()
                    meta["page_content"] = getattr(doc, "page_content", "")[:50000]  # éviter gros blobs
                    metadatas.append(meta)
                except Exception:
                    metadatas.append({"source": "unknown", "doc_id": doc_id})

            with open(tmp_meta, "wb") as f:
                pickle.dump(metadatas, f)
            os.replace(tmp_meta, final_meta)

            print("✅ Vector store sauvegardé (atomique)")
        except Exception as e:
            print(f"❌ Erreur sauvegarde vectorstore: {e}")

    def add_documents(self, documents: List[Document], user_id: str = None):
        """Ajoute des documents et sauvegarde"""
        if not documents:
            return 0
        for doc in documents:
            if user_id:
                doc.metadata["user_id"] = user_id
        texts = self.text_splitter.split_documents(documents) if self.text_splitter else documents
        if texts:
            self.vectorstore.add_documents(texts)
            self.save_vectorstore()
            return len(texts)
        return 0


    def search_similar(self, query: str, k: int = 4, user_id: str = None, filters: dict = None):
        """Recherche - essayer appliquer filters si le vectorstore les supporte"""
        try:
            # Utiliser l'API similarity_search native
            results = self.vectorstore.similarity_search(query, k=k)
            if user_id:
                filtered = [doc for doc in results if doc.metadata.get("user_id") == user_id]
                if len(filtered) < k:
                    # compléter avec non-filtrés
                    for d in results:
                        if d not in filtered and len(filtered) < k:
                            filtered.append(d)
                return filtered[:k]
            return results[:k]
        except Exception as e:
            print(f"❌ Erreur recherche FAISS: {e}")
            return []

    def get_stats(self):
        try:
            total_docs = len(self.vectorstore.index_to_docstore_id) if self.vectorstore else 0
            return {"total_documents": total_docs, "index_type": "FAISS", "embedding_model": "all-MiniLM-L6-v2"}
        except Exception:
            return {"error": "Impossible de récupérer stats"}

# factory global mais pas auto-initialisé
vector_store = VectorStoreManager()