# services/document_processor.py 
from pypdf import PdfReader # PdfReader : Nouvelle API de PyPDF2 pour lire les PDFs
import docx2txt # docx2txt : Librairie pour extraire le texte des fichiers Word
from typing import List, Dict
import tempfile # tempfile : Création de fichiers temporaires sécurisés
import os
from langchain.schema import Document
from datetime import datetime

class DocumentProcessor:
    @staticmethod # Permet d'appeler les méthodes sans instancier la classe
    def process_pdf(file_path: str) -> List[str]:
        """Extrait le texte d'un PDF avec pypdf (nouvelle API)"""
        texts = []
        try:
            with open(file_path, 'rb') as file: # Ouvre le PDF en mode binaire ('rb')
                pdf_reader = PdfReader(file)
                for page in pdf_reader.pages: # Parcourt chaque page
                    text = page.extract_text() # Extrait le texte de chaque page
                    if text and text.strip(): # Filtre les pages vides
                        texts.append(text)
            return texts
        except Exception as e:
            raise Exception(f"Erreur lecture PDF: {str(e)}")
    
    @staticmethod
    def process_docx(file_path: str) -> List[str]:
        """Extrait le texte d'un DOCX"""
        try:
            text = docx2txt.process(file_path) # extrait tout le texte du document Word
            return [text] if text and text.strip() else []
        except Exception as e:
            raise Exception(f"Erreur lecture DOCX: {str(e)}")
    
    @staticmethod
    def process_txt(file_path: str) -> List[str]:
        """Extrait le texte d'un fichier texte"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file: # Ouvre en mode lecture avec encoding UTF-8
                text = file.read()
                return [text] if text and text.strip() else []
        except Exception as e:
            raise Exception(f"Erreur lecture TXT: {str(e)}")
    
    def process_uploaded_file(self, file, user_id: str) -> Dict:
        """Traite un fichier uploadé"""
        tmp_file_path = None
        try:
            # Sauvegarder le fichier temporairement
            with tempfile.NamedTemporaryFile(delete=False, suffix=file.filename) as tmp_file: # Crée un fichier temporaire avec le nom original
                content = file.file.read()
                tmp_file.write(content)
                tmp_file_path = tmp_file.name
            
            # Traiter selon l'extension
            file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
            
            if file_extension == 'pdf':
                texts = self.process_pdf(tmp_file_path)
            elif file_extension in ['docx', 'doc']:
                texts = self.process_docx(tmp_file_path)
            elif file_extension == 'txt':
                texts = self.process_txt(tmp_file_path)
            else:
                raise Exception(f"Format non supporté: {file_extension}")
            
            # Nettoyer le fichier temporaire
            if tmp_file_path and os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path) 
            
            # Préparer les métadonnées
            metadata = [{
                "source": file.filename,
                "file_type": file_extension,
                "processed_at": datetime.now().isoformat()
            } for _ in texts]  # Une métadonnée par texte extrait
            
            return {
                "texts": texts,
                "metadata": metadata,
                "chunk_count": len(texts) # Nombre de textes/chunks
            }
            
        except Exception as e:
            # Nettoyer en cas d'erreur
            if tmp_file_path and os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path) # Le fichier temporaire est supprimé même en cas d'erreur
            raise e

# Instance globale
document_processor = DocumentProcessor()
