# core/database.py
import firebase_admin # SDK officiel Firebase pour Python
from firebase_admin import credentials, firestore # credentials : Gère l'authentification avec les clés de service , firestore : Base de données NoSQL de Firebase
import os
from .config import settings

def init_firebase():
    try:
        if not firebase_admin._apps: # _apps est une liste interne des applications Firebase initialisées
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS)
            firebase_admin.initialize_app(cred, {
                'projectId': settings.PROJECT_ID
            })
        return firestore.client() # Retourne une instance du client Firestore pour interagir avec la BD
    except Exception as e:
        print(f"Erreur initialisation Firebase: {e}")
        raise

# Initialisation
# db = init_firebase() #  Initialise et stocke le client Firestore
# users_ref = db.collection('users') # Crée une référence à la collection 'users'

_db = None

def get_db():
    global _db
    if _db is None:
        _db = init_firebase()
    return _db

# references lazy
users_ref = None
def get_users_ref():
    global users_ref
    if users_ref is None:
        db = get_db()
        users_ref = db.collection('users')
    return users_ref

db = get_db()
users_ref = get_users_ref()