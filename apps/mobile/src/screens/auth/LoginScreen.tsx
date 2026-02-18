import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { authApi } from '../../lib/api';
import { colors } from '../../theme/colors';

type Step = 'ci' | 'login' | 'register';

export default function LoginScreen() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('ci');
  const [ci, setCi] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLookupCI = async () => {
    if (!ci.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await authApi.lookupCI(ci.trim());
      if (data.exists) {
        setPlayerName(data.fullName || 'Jugador');
        setStep('login');
      } else {
        setStep('register');
      }
    } catch (err: any) {
      // If 404, player doesn't exist -> register
      setStep('register');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      await login(ci.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !regPassword.trim()) {
      setError('Completa todos los campos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.register({
        ci: ci.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        dateOfBirth: dateOfBirth.trim() || undefined,
        password: regPassword,
      });
      // Auto-login after register
      await login(ci.trim(), regPassword);
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep('ci');
    setPassword('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Ionicons name="football" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>AUFA</Text>
            <Text style={styles.subtitle}>Nube de Ligas</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Step: CI lookup */}
            {step === 'ci' && (
              <>
                <Text style={styles.cardTitle}>Ingresa tu Cedula</Text>
                <Text style={styles.cardDesc}>
                  Ingresa tu numero de CI para buscar tu cuenta o crear una nueva.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 12345678"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                  value={ci}
                  onChangeText={setCi}
                  autoFocus
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <TouchableOpacity
                  style={[styles.button, !ci.trim() && styles.buttonDisabled]}
                  onPress={handleLookupCI}
                  disabled={loading || !ci.trim()}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Continuar</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Step: Login */}
            {step === 'login' && (
              <>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={20} color={colors.primary} />
                  <Text style={styles.backText}>Volver</Text>
                </TouchableOpacity>
                <Text style={styles.cardTitle}>Hola, {playerName}!</Text>
                <Text style={styles.cardDesc}>Ingresa tu contrasena para continuar.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contrasena"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoFocus
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <TouchableOpacity
                  style={[styles.button, !password.trim() && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading || !password.trim()}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Iniciar Sesion</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Step: Register */}
            {step === 'register' && (
              <>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={20} color={colors.primary} />
                  <Text style={styles.backText}>Volver</Text>
                </TouchableOpacity>
                <Text style={styles.cardTitle}>Crear Cuenta</Text>
                <Text style={styles.cardDesc}>CI: {ci} - No encontrada. Registrate:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre completo"
                  placeholderTextColor={colors.textLight}
                  value={fullName}
                  onChangeText={setFullName}
                  autoFocus
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Fecha de nacimiento (DD/MM/AAAA)"
                  placeholderTextColor={colors.textLight}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contrasena"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry
                  value={regPassword}
                  onChangeText={setRegPassword}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Crear Cuenta</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Demo credentials */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Credenciales de prueba</Text>
            <Text style={styles.demoText}>CI: 12345678 / player123</Text>
            <Text style={styles.demoText}>admin@aufa.uy / admin123</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  logoArea: { alignItems: 'center', marginTop: 32, marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.textOnPrimary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 32, fontWeight: '800', color: colors.textOnPrimary },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  cardDesc: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, fontSize: 16, color: colors.text,
    backgroundColor: colors.background, marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary, borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 14, marginBottom: 8 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { color: colors.primary, fontSize: 14, marginLeft: 4 },
  demoBox: {
    marginTop: 24, padding: 16, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  demoTitle: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginBottom: 4 },
  demoText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
});
