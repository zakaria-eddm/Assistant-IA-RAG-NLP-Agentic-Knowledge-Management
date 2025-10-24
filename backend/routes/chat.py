# routes/chat.py
from fastapi import APIRouter, Depends, HTTPException
from core import security
from schemas.chat_schemas import ChatRequest, ChatResponse, ConversationList
from services.chat_service import chat_service
# from services.agentic_chat_service import process_chat_with_agentic  # Nouvelle importation

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest, 
    current_user: dict = Depends(security.get_current_user)
):
    """Endpoint de chat unifié avec détection intelligente"""
    try:
        return await chat_service.process_chat_message(
            user_id=current_user["id"],
            message=request.message,
            conversation_id=request.conversation_id,
            use_agentic=True  # Détection automatique
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(security.get_current_user)
):
    try:
        from core.database import db
        conv_ref = db.collection('users').document(current_user["id"]).collection('conversations').document(conversation_id)
        conversation = conv_ref.get()
        
        if conversation.exists:
            return conversation.to_dict()
        else:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(security.get_current_user)
):
    """Supprime une conversation"""
    try:
        from core.database import db
        conv_ref = db.collection('users').document(current_user["id"]).collection('conversations').document(conversation_id)
        conv = conv_ref.get()
        
        if not conv.exists:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        conv_ref.delete()
        return {"message": "Conversation supprimée avec succès"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/conversations", response_model=ConversationList)
async def get_user_conversations(
    current_user: dict = Depends(security.get_current_user)
):
    try:
        from core.database import db
        convs_ref = db.collection('users').document(current_user["id"]).collection('conversations')
        conversations = []
        
        for doc in convs_ref.order_by('updated_at', direction='DESCENDING').stream():
            conv_data = doc.to_dict()
            conversations.append(conv_data)
            
        return {"conversations": conversations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
