# schemas/chat_schemas.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Message(BaseModel):
    role: str
    content: str
    timestamp: str

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    conversation_id: str

class Conversation(BaseModel):
    id: str
    title: str
    messages: List[Message]
    created_at: str
    updated_at: str

class ConversationList(BaseModel):
    conversations: List[Conversation]
