import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Animated,
  Easing
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, User, Mail, Lock, ChevronRight } from 'lucide-react-native';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth();
  
  const handleChange = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    };
  const handleFocus = (field) => {
    setFocusedField(field);
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  const handleSubmit = async () => {
      if (!formData.email || !formData.name || !formData.password) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
        return;
      }
  
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
        return;
      }

      if (formData.password.length < 8) {
        Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
        return;
      }

    setIsLoading(true);
    try {
      const response = await fetch('http://192.168.255.185:8000/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        await login(formData.email, formData.password);
        navigation.replace('Chat');
      } else {
        Alert.alert('Erreur', data.detail || 'Erreur lors de l\'inscription');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header Section */}
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            <View style={styles.header}>
              <LinearGradient
                colors={['#3b82f6', '#8b5cf6']}
                style={styles.logo}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.logoText}>AI</Text>
              </LinearGradient>
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>Rejoignez notre communauté dès aujourd'hui</Text>
            </View>

            {/* Form Section */}
            <View style={styles.form}>
              {/* Name Input */}
              <View style={[
                styles.inputContainer,
                focusedField === 'name' && styles.inputContainerFocused
              ]}>
                <User size={20} color={focusedField === 'name' ? '#3b82f6' : '#94a3b8'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => handleChange('name', text)}
                  onFocus={() => handleFocus('name')}
                  onBlur={handleBlur}
                  placeholder="Nom complet"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                />
              </View>

              {/* Email Input */}
              <View style={[
                styles.inputContainer,
                focusedField === 'email' && styles.inputContainerFocused
              ]}>
                <Mail size={20} color={focusedField === 'email' ? '#3b82f6' : '#94a3b8'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => handleChange('email', text)}
                  onFocus={() => handleFocus('email')}
                  onBlur={handleBlur}
                  placeholder="Adresse email"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {/* Password Input */}
              <View style={[
                styles.inputContainer,
                focusedField === 'password' && styles.inputContainerFocused
              ]}>
                <Lock size={20} color={focusedField === 'password' ? '#3b82f6' : '#94a3b8'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={formData.password}
                  onChangeText={(text) => handleChange('password', text)}
                  onFocus={() => handleFocus('password')}
                  onBlur={handleBlur}
                  placeholder="Mot de passe (min. 8 caractères)"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                  {showPassword ? (
                    <EyeOff size={20} color="#94a3b8" />
                  ) : (
                    <Eye size={20} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <View style={[
                styles.inputContainer,
                focusedField === 'confirmPassword' && styles.inputContainerFocused
              ]}>
                <Lock size={20} color={focusedField === 'confirmPassword' ? '#3b82f6' : '#94a3b8'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleChange('confirmPassword', text)}
                  onFocus={() => handleFocus('confirmPassword')}
                  onBlur={handleBlur}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={toggleConfirmPasswordVisibility} style={styles.eyeIcon}>
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#94a3b8" />
                  ) : (
                    <Eye size={20} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#526d9cff', '#092a55ff']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Créer mon compte</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer Section */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Déjà un compte ? </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingTop:"6%",
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  logoText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14.5,
    color: '#94a3b8',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputContainerFocused: {
    borderColor: '#3b82f6',
    backgroundColor: '#ffffff',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 12,
    color: '#1e293b',
    height: '100%',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    padding: 8,
    position: 'absolute',
    right: 8,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    elevation: 5,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerText: {
    color: '#cbd5e1',
    fontSize: 15,
  },
  footerLink: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '600',
  },
  termsContainer: {
    paddingHorizontal: 20,
  },
  termsText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#3b82f6',
    fontWeight: '500',
  },
});

export default RegisterScreen;
