import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  Platform,
  Animated,
  Easing
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { userService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const UserSettings = ({ onClose, onLogout, onDeleteAccount }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { user, updateUserProfile } = useAuth();
  const shakeAnimation = useState(new Animated.Value(0))[0];

  const startShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const handleUpdateProfile = async () => {
    if (userData.password && userData.password !== userData.confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      startShake();
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = {};
      if (userData.name && userData.name !== user.name) {
        updateData.name = userData.name;
      }
      if (userData.password) {
        updateData.password = userData.password;
      }

      if (Object.keys(updateData).length > 0) {
        await updateUserProfile(updateData);
        Alert.alert('Succès', 'Profil mis à jour');
        setUserData({ name: '', password: '', confirmPassword: '' });
      } else {
        Alert.alert('Info', 'Aucune modification à apporter');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'SUPPRIMER') {
      Alert.alert('Erreur', 'Veuillez taper "SUPPRIMER" pour confirmer');
      startShake();
      return;
    }

    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: onDeleteAccount }
      ]
    );
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.title}>Paramètres</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
              onPress={() => setActiveTab('profile')}
            >
              <Icon 
                name="person" 
                size={18} 
                color={activeTab === 'profile' ? '#3b82f6' : '#94a3b8'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'profile' && styles.activeTabText
              ]}>
                Profil
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'danger' && styles.activeTab]}
              onPress={() => setActiveTab('danger')}
            >
              <Icon 
                name="warning" 
                size={18} 
                color={activeTab === 'danger' ? '#ef4444' : '#94a3b8'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'danger' && styles.activeDangerText
              ]}>
                Danger
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {activeTab === 'profile' && (
              <View>
                <Text style={styles.sectionTitle}>Informations personnelles</Text>
                
                <Text style={styles.inputLabel}>Nom</Text>
                <TextInput
                  style={styles.input}
                  placeholder={user?.name || "Votre nom"}
                  placeholderTextColor="#94a3b8"
                  value={userData.name}
                  onChangeText={(text) => setUserData({...userData, name: text})}
                />
                
                <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Laisser vide pour ne pas changer"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={userData.password}
                  onChangeText={(text) => setUserData({...userData, password: text})}
                />
                
                <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
                <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmer le nouveau mot de passe"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={userData.confirmPassword}
                    onChangeText={(text) => setUserData({...userData, confirmPassword: text})}
                  />
                </Animated.View>
                
                <TouchableOpacity
                  style={[styles.updateButton, isUpdating && styles.disabledButton]}
                  onPress={handleUpdateProfile}
                  disabled={isUpdating}
                >
                  <LinearGradient
                    colors={['#8b5cf6', '#3b82f6']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isUpdating ? (
                      <Icon name="refresh" size={20} color="#fff" style={styles.loadingIcon} />
                    ) : (
                      <Icon name="check" size={20} color="#fff" />
                    )}
                    <Text style={styles.buttonText}>
                      {isUpdating ? 'Mise à jour...' : 'Mettre à jour'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'danger' && (
              <View>
                <View style={styles.warningContainer}>
                  <Icon name="warning" size={24} color="#ef4444" />
                  <Text style={styles.warningTitle}>
                    Zone dangereuse
                  </Text>
                  <Text style={styles.warningText}>
                    La suppression de votre compte est irréversible. Toutes vos données seront perdues.
                  </Text>
                </View>

                <Text style={styles.inputLabel}>
                  Tapez "SUPPRIMER" pour confirmer
                </Text>
                <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
                  <TextInput
                    style={[styles.input, styles.dangerInput]}
                    autoCapitalize="characters" 
                    placeholder='SUPPRIMER'
                    placeholderTextColor="#94a3b8"
                    value={deleteConfirm}
                    onChangeText={setDeleteConfirm}
                  />
                </Animated.View>

                <TouchableOpacity
                  style={[styles.deleteButton, deleteConfirm !== 'SUPPRIMER' && styles.disabledButton]}
                  onPress={handleDeleteAccount}
                  disabled={deleteConfirm !== 'SUPPRIMER'}
                >
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon name="delete-forever" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Supprimer mon compte</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <LinearGradient
              colors={['#475569', '#334155']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="logout" size={20} color="#fff" />
              <Text style={styles.buttonText}>Se déconnecter</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  activeDangerText: {
    color: '#ef4444',
  },
  content: {
    padding: 20,
    maxHeight: 400,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
    
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  dangerInput: {
    borderColor: '#ef4444',
  },
  warningContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',

  },
  warningTitle: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  warningText: {
    color: '#e2e8f0',
    fontSize: 14,
    textAlign: 'center',
  },
  updateButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 40,
  },
  deleteButton: {
    marginTop: 16,
    marginBottom: 40,
    borderRadius: 12,
    overflow: 'hidden',

  },
  logoutButton: {
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingIcon: {
    transform: [{ rotate: '0deg' }],
  },
});

export default UserSettings;