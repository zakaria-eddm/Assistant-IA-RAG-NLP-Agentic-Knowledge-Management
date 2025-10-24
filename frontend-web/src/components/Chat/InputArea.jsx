// components/Chat/InputArea.jsx 
import React, { useState } from 'react';
import { Send, Plus, FileText, ArrowUp, Sparkles } from 'lucide-react';

const InputArea = ({ input, setInput, isLoading, onSend, onTextAdded }) => {
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textSource, setTextSource] = useState('manual_input');
  const [isAddingText, setIsAddingText] = useState(false);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    onSend();
  };

  const handleAddText = async () => {
    if (!textInput.trim()) return;

    setIsAddingText(true);
    try {
      // Construction de l'URL avec les paramètres de query string
      const params = new URLSearchParams({
        text: textInput,
        source: textSource
      });

      console.log('Request URL:', `/api/v1/documents/text?${params}`); // Debug

      const response = await fetch(`http://localhost:8000/api/v1/documents/text?${params}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Accept': 'application/json'
        }
        // Pas de body car les paramètres sont dans l'URL
      });

      console.log('Response status:', response.status); // Debug

      if (response.ok) {
        const result = await response.json();
        console.log('Success:', result);
        
        setShowTextInput(false);
        setTextInput('');
        
        // Ajouter un message de confirmation dans le chat
        if (onTextAdded) {
          onTextAdded({
            id: Date.now(),
            role: 'system',
            content: `✅ Texte ajouté à la base de connaissances ! ${result.chunks_added} fragments ajoutés. (Source: ${textSource})`,
            timestamp: new Date().toISOString()
          });
        }
        
        showNotification('Texte ajouté avec succès !', 'success');
      } else {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText };
        }
        throw new Error(errorData.detail || `Erreur HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Full error:', error);
      showNotification(`Erreur: ${error.message}`, 'error');
      
      if (onTextAdded) {
        onTextAdded({
          id: Date.now(),
          role: 'system',
          content: `❌ Erreur lors de l'ajout du texte: ${error.message}`,
          timestamp: new Date().toISOString(),
          isError: true
        });
      }
    } finally {
      setIsAddingText(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 16px';
    notification.style.borderRadius = '8px';
    notification.style.color = 'white';
    notification.style.fontWeight = '500';
    notification.style.zIndex = '10000';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    
    if (type === 'success') {
      notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else if (type === 'error') {
      notification.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
    } else {
      notification.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      setTimeout(() => document.body.removeChild(notification), 500);
    }, 3000);
  };

  return (
    <div style={{
      padding: '1.5rem',
      background: 'rgba(30, 41, 59, 0.8)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid #334155',
      position: 'relative'
    }}>
      <div style={{ maxWidth: '768px', margin: '0 auto' }}>
        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginBottom: '1rem',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: showTextInput 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : 'linear-gradient(135deg, #475569, #334155)',
              color: 'white',
              border: 'none',
              borderRadius: '2rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {showTextInput && (
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
                animation: 'shimmer 2s infinite'
              }}></div>
            )}
            <FileText size={14} />
            {showTextInput ? 'Annuler' : 'Ajouter du texte'}
          </button>

          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '2rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'pulse 2s infinite'
          }}>
            <Sparkles size={14} />
            Mode Intelligent Activé
          </div>
        </div>

        {/* Text Input Area */}
        {showTextInput && (
          <div style={{
            background: '#1e293b',
            border: '1px solid #8b5cf6',
            borderRadius: '1rem',
            padding: '1rem',
            marginBottom: '1rem',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <h4 style={{
              marginBottom: '1rem',
              color: '#e2e8f0',
              fontWeight: '600',
              fontSize: '1rem'
            }}>
              📝 Ajouter du texte à la base de connaissances
            </h4>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#e2e8f0',
                fontWeight: '500'
              }}>
                Texte à ajouter
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Collez ou écrivez le texte que vous souhaitez ajouter à la base de connaissances..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.75rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                  color: '#e2e8f0',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  lineHeight: '1.5'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#e2e8f0',
                fontWeight: '500'
              }}>
                Source du texte
              </label>
              <select
                value={textSource}
                onChange={(e) => setTextSource(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.375rem',
                  color: '#e2e8f0'
                }}
              >
                <option value="manual_input">Saisie manuelle</option>
                <option value="website">Site web</option>
                <option value="document">Document</option>
                <option value="research">Recherche</option>
                <option value="notes">Notes personnelles</option>
                <option value="book">Livre</option>
                <option value="article">Article</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                marginRight: 'auto'
              }}>
                📊 {textInput.length} caractères
              </span>
              
              <button
                onClick={() => setShowTextInput(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#334155',
                  color: '#e2e8f0',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Annuler
              </button>
              
              <button
                onClick={handleAddText}
                disabled={!textInput.trim() || isAddingText}
                style={{
                  padding: '0.5rem 1rem',
                  background: !textInput.trim() || isAddingText ? 
                    '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: !textInput.trim() || isAddingText ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                {isAddingText ? (
                  <>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Ajout...
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Ajouter
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Main Input Field */}
        <div style={{ 
          position: 'relative',
          background: '#1e293b',
          border: '1px solid #8b5cf6',
          borderRadius: '1rem',
          padding: '0.75rem',
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)'
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Posez votre question à l'assistant IA..."
            style={{
              width: '100%',
              minHeight: '60px',
              maxHeight: '120px',
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              color: '#e2e8f0',
              fontFamily: 'inherit',
              resize: 'none',
              lineHeight: '1.5',
              outline: 'none'
            }}
            disabled={isLoading}
          />
          
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              position: 'absolute',
              right: '0.75rem',
              bottom: '0.75rem',
              padding: '0.5rem',
              background: input.trim() ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : '#334155',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !input.trim()) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? (
              <div style={{
                width: '1rem',
                height: '1rem',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            ) : (
              <ArrowUp size={18} />
            )}
          </button>
        </div>

        {/* Tips */}
        <div style={{ 
          marginTop: '0.75rem', 
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          💡 Appuyez sur Entrée pour envoyer • Shift+Entrée pour un saut de ligne
        </div>
      </div>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
};

export default InputArea;