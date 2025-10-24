import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  LogOut, 
  Upload, 
  User,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getConversations } from '../../services/api';

const Sidebar = ({ 
  conversations, 
  onNewChat, 
  onSelectConversation, 
  currentConversationId,
  onFileUpload 
}) => {
  const [conversationsList, setConversationsList] = useState([]);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversationsList(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div style={{
      width: '300px',
      height: '100vh',
      backgroundColor: '#f8fafc',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: 'white'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            color: '#1e293b',
            margin: 0
          }}>
            Assistant IA
          </h2>
          <button
            onClick={onNewChat}
            style={{
              padding: '0.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* User info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          backgroundColor: '#f1f5f9',
          borderRadius: '0.375rem'
        }}>
          <User size={16} style={{ color: '#64748b' }} />
          <span style={{ 
            fontSize: '0.875rem', 
            color: '#475569',
            flex: 1
          }}>
            {user?.email || 'Utilisateur'}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.25rem',
              color: '#64748b',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderRadius: '0.25rem'
            }}
            title="Déconnexion"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={onFileUpload}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: '500'
          }}
        >
          <Upload size={16} />
          Uploader un document
        </button>
      </div>

      {/* Conversations List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        <div style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600', 
          color: '#64748b',
          padding: '0.5rem 0.75rem',
          marginBottom: '0.5rem'
        }}>
          Conversations
        </div>
        
        {conversationsList.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#94a3b8', 
            padding: '2rem 1rem',
            fontSize: '0.875rem'
          }}>
            <MessageSquare size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>Aucune conversation</p>
          </div>
        ) : (
          conversationsList.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              style={{
                padding: '0.75rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                marginBottom: '0.25rem',
                backgroundColor: currentConversationId === conversation.id ? '#e0f2fe' : 'transparent',
                border: currentConversationId === conversation.id ? '1px solid #bae6fd' : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <MessageSquare size={16} style={{ 
                color: currentConversationId === conversation.id ? '#0ea5e9' : '#64748b',
                flexShrink: 0
              }} />
              <span style={{
                fontSize: '0.875rem',
                color: currentConversationId === conversation.id ? '#0ea5e9' : '#475569',
                fontWeight: currentConversationId === conversation.id ? '500' : '400',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}>
                {conversation.title}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;