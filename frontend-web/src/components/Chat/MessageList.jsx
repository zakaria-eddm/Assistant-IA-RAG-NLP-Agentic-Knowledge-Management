// components/Chat/MessageList.jsx - Version corrigée
import React, { useState } from 'react';
import { User, Bot, Sparkles, Zap, Copy, Check, Code } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const MessageList = ({ messages }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const cleanContent = (content) => {
    // Supprimer les balises <think>...</think>
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    // Remplacer **texte** par <strong>texte</strong>
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Remplacer *texte* par <em>texte</em>
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Remplacer # Titre par <h3>Titre</h3>
    content = content.replace(/^# (.*$)/gim, '<h3>$1</h3>');
    
    // Remplacer ## Sous-titre par <h4>Sous-titre</h4>
    content = content.replace(/^## (.*$)/gim, '<h4>$1</h4>');
    
    return content;
  };

  const renderContent = (content) => {
    // Nettoyer le contenu
    content = cleanContent(content);
    
    // Détection des blocs de code
    const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Texte avant le bloc de code
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        });
      }

      // Bloc de code
      const language = match[1] || 'text';
      const code = match[2].trim();
      parts.push({
        type: 'code',
        language,
        code
      });

      lastIndex = match.index + match[0].length;
    }

    // Texte après le dernier bloc de code
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex)
      });
    }

    if (parts.length === 0) {
      return (
        <div 
          style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    return parts.map((part, index) => {
      if (part.type === 'text') {
        return (
          <div 
            key={index} 
            style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: '1rem' }}
            dangerouslySetInnerHTML={{ __html: part.content }}
          />
        );
      } else {
        return (
          <div key={index} style={{ marginBottom: '1rem', position: 'relative' }}>
            <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '0.5rem',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#0f172a',
                padding: '0.5rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #334155'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Code size={14} style={{ color: '#8b5cf6' }} />
                  <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>
                    {part.language.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(part.code, index)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: 'transparent',
                    border: '1px solid #334155',
                    borderRadius: '0.25rem',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem'
                  }}
                >
                  {copiedIndex === index ? (
                    <>
                      <Check size={12} style={{ color: '#10b981' }} />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copier
                    </>
                  )}
                </button>
              </div>
              <SyntaxHighlighter
                language={part.language}
                style={atomOneDark}
                customStyle={{
                  background: 'transparent',
                  padding: '1rem',
                  margin: 0,
                  fontSize: '0.875rem'
                }}
                wrapLongLines={true}
              >
                {part.code}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {messages.map((message, index) => (
        <div
          key={message.id}
          style={{
            display: 'flex',
            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            animation: 'messageSlide 0.3s ease-out'
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            gap: '0.75rem',
            maxWidth: '80%'
          }}>
            {/* Avatar */}
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: message.role === 'user' 
                ? 'linear-gradient(135deg, #3b82f6, #2563eb)' 
                : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}>
              {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>

            {/* Message Content */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '1.25rem',
                background: message.role === 'user' 
                  ? 'linear-gradient(135deg, #3b82f6, #2563eb)' 
                  : 'linear-gradient(135deg, #1e293b, #334155)',
                color: message.role === 'user' ? 'white' : '#e2e8f0',
                border: message.role === 'assistant' ? '1px solid #475569' : 'none',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                overflow: 'hidden',
                minWidth: '200px'
              }}
            >
              {/* Animation pour les messages agentiques */}
              {message.metadata?.actions_executed && (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    height: '2px',
                    background: 'linear-gradient(90deg, #8b5cf6, #3b82f6, #8b5cf6)',
                    animation: 'shimmer 3s infinite'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.75rem',
                    background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    animation: 'pulse 2s infinite'
                  }}>
                    <Zap size={12} />
                    Agentique
                  </div>
                </>
              )}
              
              {/* Contenu du message */}
              <div style={{ lineHeight: '1.6' }}>
                {renderContent(message.content)}
              </div>

              {/* Timestamp */}
              <div style={{
                fontSize: '0.75rem',
                color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                marginTop: '1rem',
                textAlign: 'right'
              }}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* CSS Animations */}
      <style>
        {`
          @keyframes messageSlide {
            from {
              opacity: 0;
              transform: translateY(1rem);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          /* Styles pour le markdown */
          strong {
            font-weight: 600;
            color: inherit;
          }
          
          em {
            font-style: italic;
            color: inherit;
          }
          
          h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 1rem 0 0.5rem 0;
            color: inherit;
          }
          
          h4 {
            font-size: 1.125rem;
            font-weight: 600;
            margin: 0.75rem 0 0.5rem 0;
            color: inherit;
          }
        `}
      </style>
    </div>
  );
};

export default MessageList;