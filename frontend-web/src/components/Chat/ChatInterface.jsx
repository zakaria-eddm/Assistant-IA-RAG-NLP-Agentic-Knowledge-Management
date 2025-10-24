// components/Chat/ChatInterface.jsx 
import React, { useState, useRef, useEffect } from 'react';
import { chatService } from '../../services/api';
import MessageList from './MessageList';
import InputArea from './InputArea';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, FileText, MessageSquare, User, LogOut, Plus, Menu, X, Bot, Sparkles, Trash2, Settings } from 'lucide-react';
import UserSettings from '../User/UserSettings';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(null);
  const messagesEndRef = useRef(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    scrollToBottom();
    loadConversations();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
  };

  const handleTextAdded = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSelectConversation = async (convId) => {
    try {
      const conversation = await chatService.getConversation(convId);
      setMessages(conversation.messages || []);
      setConversationId(convId);
      setShowSidebar(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    setDeletingConversation(convId);
    
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
      setDeletingConversation(null);
      return;
    }

    try {
      await chatService.deleteConversation(convId);
      await loadConversations();
      
      if (conversationId === convId) {
        setMessages([]);
        setConversationId(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Erreur lors de la suppression de la conversation');
    } finally {
      setDeletingConversation(null);
    }
  };

  const handleSend = async (useAgentic = false) => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage(input, conversationId);
      
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        metadata: response
      };

      setMessages(prev => [...prev, aiMessage]);
      setConversationId(response.conversation_id);
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:8000/api/v1/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'system',
          content: `📄 Fichier "${result.filename}" uploadé avec succès! ${result.chunks_added} fragments ajoutés.`,
          timestamp: new Date().toISOString()
        }]);
        setShowFileUpload(false);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'system',
        content: '❌ Erreur lors de l\'upload du fichier',
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsUploading(false);
    }
  };

  const getUserInitial = () => user?.email ? user.email[0].toUpperCase() : 'U';
  const getUserName = () => user?.name || user?.email?.split('@')[0] || 'Utilisateur';

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex',
      backgroundColor: '#0f172a',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Sidebar */}
      <div style={{
        width: showSidebar ? '320px' : '0',
        backgroundColor: '#1e293b',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden'
      }}>
        {/* Header Sidebar */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={20} />
            </div>
            <span style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Assistant IA
            </span>
          </div>
          <button
            onClick={() => setShowSidebar(false)}
            style={{
              padding: '0.5rem',
              backgroundColor: '#334155',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              color: '#94a3b8'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* New Chat Button */}
        <div style={{ padding: '1rem' }}>
          <button
            onClick={handleNewChat}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <Plus size={16} />
            Nouvelle conversation
          </button>
        </div>

        {/* File Upload Button */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>
          <button
            onClick={() => setShowFileUpload(true)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'linear-gradient(135deg, #475569, #334155)',
              color: '#e2e8f0',
              border: '1px solid #475569',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <Upload size={16} />
            Uploader un fichier
          </button>
        </div>

        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem' }}>
          <h3 style={{ 
            fontSize: '0.875rem', 
            fontWeight: '600', 
            color: '#94a3b8',
            padding: '0.5rem',
            margin: '0 0 0.5rem 0'
          }}>
            Historique
          </h3>
          
          {conversations.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#64748b', 
              padding: '2rem 1rem',
              fontSize: '0.875rem'
            }}>
              <MessageSquare size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <p>Aucune conversation</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation.id)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  background: conversationId === conversation.id 
                    ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' 
                    : '#334155',
                  border: conversationId === conversation.id ? 'none' : '1px solid #475569',
                  position: 'relative'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <MessageSquare size={16} style={{ 
                    color: conversationId === conversation.id ? 'white' : '#94a3b8',
                    flexShrink: 0
                  }} />
                  <span style={{
                    fontSize: '0.875rem',
                    color: conversationId === conversation.id ? 'white' : '#e2e8f0',
                    fontWeight: conversationId === conversation.id ? '500' : '400',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}>
                    {conversation.title}
                  </span>
                  
                  <button
                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    disabled={deletingConversation === conversation.id}
                    style={{
                      padding: '0.25rem',
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: deletingConversation === conversation.id ? 'not-allowed' : 'pointer',
                      borderRadius: '0.25rem',
                      opacity: deletingConversation === conversation.id ? 0.5 : 1
                    }}
                    title="Supprimer la conversation"
                  >
                    {deletingConversation === conversation.id ? (
                      <div style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid #94a3b8',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* User info */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #334155',
          background: '#1e293b'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: '#334155',
            borderRadius: '0.75rem'
          }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              color: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}>
              {getUserInitial()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: '#f1f5f9'
              }}>
                {getUserName()}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginTop: '0.25rem'
              }}>
                <span style={{ fontSize: '0.75rem' }}>📧</span>
                {user?.email || 'Non connecté'}
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                padding: '0.5rem',
                color: '#94a3b8',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '0.375rem'
              }}
              title="Paramètres"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'rgba(30, 41, 59, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #334155'
        }}>
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              style={{
                padding: '0.5rem',
                background: '#334155',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                color: '#94a3b8'
              }}
            >
              <Menu size={20} />
            </button>
          )}
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={16} />
            </div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '1.25rem', 
              fontWeight: '600',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Assistant IA Expert
            </h1>
          </div>

          {/* User badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: '#334155',
            borderRadius: '2rem',
            cursor: 'pointer'
          }}
          onClick={() => setShowSidebar(true)}
          >
            <div style={{
              width: '2rem',
              height: '2rem',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              color: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.875rem'
            }}>
              {getUserInitial()}
            </div>
            <span style={{ 
              fontSize: '0.875rem', 
              color: '#e2e8f0'
            }}>
              {getUserName()}
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '2rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%)'
        }}>
          {messages.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#64748b', 
              marginTop: '4rem',
              padding: '2rem'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '2rem'
              }}>
                <Bot size={40} />
              </div>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600', 
                color: '#e2e8f0',
                margin: '0 0 0.5rem 0'
              }}>
                Bienvenue dans votre Assistant IA !
              </h2>
              <p style={{ 
                fontSize: '1rem', 
                color: '#94a3b8',
                margin: '0 0 2rem 0',
                maxWidth: '400px',
                margin: '0 auto'
              }}>
                Je suis votre assistant expert en IA. Posez-moi des questions ou commencez une nouvelle conversation.
              </p>
            </div>
          ) : (
            <MessageList messages={messages} />
          )}
          
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
              <div style={{
                background: '#334155',
                borderRadius: '1rem',
                padding: '1rem 1.5rem',
                border: '1px solid #475569',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
              }}>
                <div style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  border: '2px solid #8b5cf6',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span style={{ color: '#e2e8f0' }}>Réflexion en cours...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <InputArea
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          onSend={handleSend}
          onTextAdded={handleTextAdded}
        />
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid #334155',
            width: '90%',
            maxWidth: '500px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.25rem' }}>
                <Upload size={20} style={{ marginRight: '0.5rem' }} />
                Uploader un document
              </h3>
              <button
                onClick={() => setShowFileUpload(false)}
                style={{
                  padding: '0.5rem',
                  background: '#334155',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                  handleFileUpload(files[0]);
                }
              }}
              onClick={() => document.getElementById('file-input').click()}
              style={{
                border: '2px dashed #475569',
                borderRadius: '0.75rem',
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: '#1e293b',
                cursor: 'pointer'
              }}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf,.txt,.docx"
                onChange={(e) => {
                  if (e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
              
              {isUploading ? (
                <div>
                  <div style={{
                    width: '3rem',
                    height: '3rem',
                    border: '2px solid #8b5cf6',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                  }}></div>
                  <p style={{ color: '#94a3b8', margin: 0 }}>Upload en cours...</p>
                </div>
              ) : (
                <div>
                  <FileText size={48} style={{ color: '#8b5cf6', marginBottom: '1rem' }} />
                  <p style={{ color: '#e2e8f0', margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>
                    Glissez-déposez votre fichier ici
                  </p>
                  <p style={{ color: '#94a3b8', margin: 0 }}>
                    ou cliquez pour sélectionner (PDF, TXT, DOCX)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Settings Modal */}
      {showSettings && (
        <UserSettings onClose={() => setShowSettings(false)} />
      )}

      {/* CSS Animation */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          ::-webkit-scrollbar {
            width: 6px;
          }
          ::-webkit-scrollbar-track {
            background: #1e293b;
          }
          ::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}
      </style>
    </div>
  );
};

export default ChatInterface;