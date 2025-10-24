// components/User/UserSettings.jsx - Version corrigée
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Trash2, User, Shield, AlertTriangle, LogOut, Save, Edit } from 'lucide-react';

const UserSettings = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const { user, logout, updateUserProfile } = useAuth();

  React.useEffect(() => {
    if (user) {
      setUserData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    if (userData.password && userData.password !== userData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      setIsUpdating(false);
      return;
    }

    try {
      const updateData = {};
      if (userData.name !== user.name) {
        updateData.name = userData.name;
      }
      if (userData.password) {
        updateData.password = userData.password;
      }

      if (Object.keys(updateData).length > 0) {
        await updateUserProfile(updateData);
        showNotification('Profil mis à jour avec succès !', 'success');
        // Fermer le modal après un délai
        setTimeout(() => onClose(), 1500);
      } else {
        showNotification('Aucune modification détectée', 'info');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Erreur lors de la mise à jour', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      alert('Veuillez taper "SUPPRIMER" pour confirmer');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      onClose();
    } catch (error) {
      console.error('Error deleting account:', error);
      showNotification('Erreur lors de la suppression du compte', 'error');
    } finally {
      setIsDeleting(false);
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
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            margin: 0,
            color: '#1e293b'
          }}>
            Paramètres utilisateur
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc'
        }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '1rem 1.5rem',
              background: activeTab === 'profile' ? 'white' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'profile' ? '600' : '400',
              color: activeTab === 'profile' ? '#3b82f6' : '#64748b',
              borderBottom: activeTab === 'profile' ? '2px solid #3b82f6' : '2px solid transparent'
            }}
          >
            <User size={16} style={{ marginRight: '0.5rem' }} />
            Profil
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            style={{
              padding: '1rem 1.5rem',
              background: activeTab === 'danger' ? 'white' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'danger' ? '600' : '400',
              color: activeTab === 'danger' ? '#dc2626' : '#64748b',
              borderBottom: activeTab === 'danger' ? '2px solid #dc2626' : '2px solid transparent'
            }}
          >
            <Shield size={16} style={{ marginRight: '0.5rem' }} />
            Zone de danger
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '400px' }}>
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile}>
              <h3 style={{ 
                marginBottom: '1rem', 
                fontWeight: '600',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Edit size={20} />
                Modifier le profil
              </h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={userData.email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    background: '#f9fafb',
                    color: '#6b7280'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  L'email ne peut pas être modifié
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Nom complet
                </label>
                <input
                  type="text"
                  value={userData.name}
                  onChange={(e) => setUserData({...userData, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    color: '#374151'
                  }}
                  placeholder="Votre nom"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Nouveau mot de passe (laisser vide pour ne pas changer)
                </label>
                <input
                  type="password"
                  value={userData.password}
                  onChange={(e) => setUserData({...userData, password: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    color: '#374151'
                  }}
                  placeholder="Nouveau mot de passe"
                />
              </div>

              {userData.password && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={userData.confirmPassword}
                    onChange={(e) => setUserData({...userData, confirmPassword: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      color: '#374151'
                    }}
                    placeholder="Confirmer le mot de passe"
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: isUpdating ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: '500'
                  }}
                >
                  {isUpdating ? (
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  ) : (
                    <Save size={16} />
                  )}
                  {isUpdating ? 'Mise à jour...' : 'Enregistrer'}
                </button>

                <button
                  type="button"
                  onClick={logout}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: '500'
                  }}
                >
                  <LogOut size={16} />
                  Déconnexion
                </button>
              </div>
            </form>
          )}

          {activeTab === 'danger' && (
            <div>
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={20} style={{ color: '#dc2626', marginRight: '0.5rem' }} />
                  <h4 style={{ color: '#dc2626', fontWeight: '600' }}>Attention</h4>
                </div>
                <p style={{ color: '#b91c1c', fontSize: '0.875rem', lineHeight: '1.5' }}>
                  La suppression de votre compte est irréversible. Toutes vos données, 
                  conversations, documents et connaissances seront définitivement supprimés.
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Tapez "SUPPRIMER" pour confirmer
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    color: '#374151',
                    textTransform: 'uppercase'
                  }}
                  placeholder="SUPPRIMER"
                />
              </div>

              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmation !== 'SUPPRIMER'}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: isDeleting ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: (isDeleting || deleteConfirmation !== 'SUPPRIMER') ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '500',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                <Trash2 size={16} />
                {isDeleting ? 'Suppression en cours...' : 'Supprimer définitivement mon compte'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSettings;