import React, { useState, useRef, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Dimensions
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { chatService, userService, documentService } from '../services/api';
import UserSettings from './UserSettings';
import MessageRenderer from './MessageRenderer';


const { width } = Dimensions.get('window');

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(null);
  const flatListRef = useRef();
  const { user, logout } = useAuth();
  const sidebarAnimation = useRef(new Animated.Value(-width * 0.8)).current;

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (showSidebar) {
      Animated.timing(sidebarAnimation, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(sidebarAnimation, {
        toValue: -width * 0.8,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true
      }).start();
    }
  }, [showSidebar]);

  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSelectConversation = async (convId) => {
    try {
      const conversation = await chatService.getConversation(convId);
      setMessages(conversation.messages || []);
      setConversationId(convId);
      setShowSidebar(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
      Alert.alert('Erreur', 'Impossible de charger la conversation');
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    setDeletingConversation(convId);
    
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer cette conversation ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => setDeletingConversation(null)
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteConversation(convId);
              await loadConversations();
              
              if (conversationId === convId) {
                setMessages([]);
                setConversationId(null);
              }
              Alert.alert('Succès', 'Conversation supprimée');
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la conversation');
            } finally {
              setDeletingConversation(null);
            }
          }
        }
      ]
    );
  };

  const handleSend = async () => {
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

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
    setShowSidebar(false);
  };

  const handleAddTextToKnowledge = async (text, source = 'manual_input') => {
    try {
      const result = await documentService.addText(text, source);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'system',
        content: `✅ Texte ajouté à la base de connaissances! ${result.chunks_added} fragments ajoutés.`,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Add text error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'system',
        content: '❌ Erreur lors de l\'ajout du texte',
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.assistantMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble
        ]}>
          <MessageRenderer content={item.content} />
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </View>
    );
  };

  const getUserInitial = () => {
    return user?.name ? user.name[0].toUpperCase() : 'U';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* Header */}
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          onPress={() => setShowSidebar(true)}
          style={styles.menuButton}
        >
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <LinearGradient
            colors={['#8b5cf6', '#3b82f6']}
            style={styles.headerIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="android" size={20} color="#fff" />
          </LinearGradient>
          <Text style={styles.headerTitle}>Assistant IA Expert</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowSidebar(true)}
          style={styles.userButton}
        >
          <LinearGradient
            colors={['#8b5cf6', '#3b82f6']}
            style={styles.userAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.userInitial}>{getUserInitial()}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#8b5cf6', '#3b82f6']}
              style={styles.emptyIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="android" size={40} color="#fff" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Bienvenue dans votre Assistant IA !</Text>
            <Text style={styles.emptyText}>
              Je suis votre assistant expert en IA. Posez-moi des questions ou commencez une nouvelle conversation.
            </Text>
          </View>
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Posez votre question à l'assistant IA..."
            placeholderTextColor="#94a3b8"
            multiline
            maxHeight={100}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <LinearGradient
              colors={input.trim() ? ['#8b5cf6', '#3b82f6'] : ['#334155', '#475569']}
              style={styles.sendButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isLoading ? (
                <Animated.View style={{ transform: [{ rotate: isLoading ? '0deg' : '360deg' }] }}>
                  <Icon name="refresh" size={20} color="#fff" style={styles.loadingIcon} />
                </Animated.View>
              ) : (
                <Icon name="send" size={20} color="#fff" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Sidebar */}
      <Animated.View 
        style={[
          styles.sidebar,
          { transform: [{ translateX: sidebarAnimation }] }
        ]}
      >
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Assistant IA</Text>
          <TouchableOpacity 
            onPress={() => setShowSidebar(false)}
            style={styles.closeButton}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewChat}
        >
          <LinearGradient
            colors={['#8b5cf6', '#3b82f6']}
            style={styles.newChatGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.newChatText}>Nouvelle conversation</Text>
          </LinearGradient>
        </TouchableOpacity>

        <ScrollView style={styles.conversationsList}>
          {conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={[
                styles.conversationItem,
                conversationId === conversation.id && styles.activeConversation
              ]}
              onPress={() => handleSelectConversation(conversation.id)}
            >
              <Icon name="forum" size={20} color="#94a3b8" />
              <Text style={styles.conversationTitle} numberOfLines={1}>
                {conversation.title}
              </Text>
              <TouchableOpacity
                onPress={(e) => handleDeleteConversation(conversation.id, e)}
                disabled={deletingConversation === conversation.id}
                style={styles.deleteButton}
              >
                {deletingConversation === conversation.id ? (
                  <Icon name="refresh" size={16} color="#94a3b8" />
                ) : (
                  <Icon name="delete-outline" size={16} color="#94a3b8" />
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.userSection}>
          <LinearGradient
            colors={['#8b5cf6', '#3b82f6']}
            style={styles.sidebarUserAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.sidebarUserInitial}>{getUserInitial()}</Text>
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setShowSidebar(false);
              setShowSettings(true);
            }}
            style={styles.settingsButton}
          >
            <Icon name="settings" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Overlay for sidebar */}
      {showSidebar && (
        <TouchableOpacity 
          style={styles.overlay}
          onPress={() => setShowSidebar(false)}
          activeOpacity={1}
        />
      )}

      {/* Settings Modal */}


       {showSettings && (
              <UserSettings 
                onClose={() => setShowSettings(false)}
                onLogout={handleLogout}
                onDeleteAccount={async () => {
                  await userService.deleteAccount();
                  await logout();
                  navigation.replace('Login');
                }}
              />
            )}
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 15,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingTop:"10%"
  },
  menuButton: {
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    
  },
  userButton: {
    padding: 8,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  messagesList: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    padding: 14,
    borderRadius: 18,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#334155',
    borderBottomLeftRadius: 4,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    backgroundColor: '#0f172a',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    minHeight: 50,
  },
  sendButton: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 8,
  },
  sendButtonGradient: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  loadingIcon: {
    transform: [{ rotate: '0deg' }],
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '80%',
    height: '100%',
    backgroundColor: '#1e293b',
    borderRadius:10,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
    paddingTop: "10%",
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  newChatButton: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  newChatText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  activeConversation: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  conversationTitle: {
    color: '#e2e8f0',
    fontSize: 15,
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  sidebarUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sidebarUserInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 13,
  },
  settingsButton: {
    padding: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 900,
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;