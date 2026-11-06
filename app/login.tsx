import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { X, Mail, Lock, ShieldCheck } from 'lucide-react-native';
import { supabase, isSupabaseConfigured } from '../src/services/supabase';
import { useAppStore } from '../src/store/useAppStore';

WebBrowser.maybeCompleteAuthSession();

export default function LoginModal() {
  const router = useRouter();
  const setUserEmail = useAppStore(state => state.setUserEmail);
  const syncWithCloud = useAppStore(state => state.syncWithCloud);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Autenticação tradicional com E-mail e Senha
  const handleAuth = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Supabase não configurado',
        'Configure suas chaves EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env para sincronizar em nuvem.'
      );
      return;
    }

    if (!email || !password) {
      Alert.alert('Campos vazios', 'Por favor informe seu e-mail e senha.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        Alert.alert('Conta criada!', 'Você já pode acessar seus dados sincronizados.');
        if (data.user?.email) {
          setUserEmail(data.user.email);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user?.email) {
          setUserEmail(data.user.email);
        }
      }

      await syncWithCloud();
      router.back();
    } catch (err: any) {
      Alert.alert('Erro na autenticação', err.message || 'Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  // Autenticação OAuth (Google)
  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Erro', 'Supabase não configurado no .env');
      return;
    }

    setOauthLoading(true);
    try {
      if (Platform.OS === 'web') {
        // No navegador
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        return;
      }

      // No mobile nativo (Expo Go / standalone)
      const redirectUri = 'pontosinistro://';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('URL de autenticação não retornada');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === 'success' && result.url) {
        // Extrai tokens retornados no hash ou query params
        const urlStr = result.url;
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        // Caso venha no hash fragment (#access_token=...&refresh_token=...)
        if (urlStr.includes('#')) {
          const hash = urlStr.split('#')[1];
          const hashParams = new URLSearchParams(hash);
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }

        // Caso venha como query params (?access_token=...&refresh_token=...)
        if (!accessToken && urlStr.includes('?')) {
          const query = urlStr.split('?')[1];
          const queryParams = new URLSearchParams(query);
          accessToken = queryParams.get('access_token');
          refreshToken = queryParams.get('refresh_token');
        }

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionErr) throw sessionErr;

          if (sessionData.user?.email) {
            setUserEmail(sessionData.user.email);
          }
          await syncWithCloud();
          router.back();
        }
      }
    } catch (err: any) {
      Alert.alert('Erro no Login com Google', err.message || 'Não foi possível completar o OAuth.');
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={36} color="#38BDF8" />
          </View>
          <Text style={styles.title}>
            {isSignUp ? 'Criar Conta Nuvem' : 'Sincronizar Aparelhos'}
          </Text>
          <Text style={styles.subtitle}>
            Acesse seu histórico e configurações de qualquer dispositivo iOS ou Android.
          </Text>

          {/* Botão de Login com Google */}
          <View style={styles.oauthContainer}>
            <TouchableOpacity
              style={styles.oauthBtn}
              onPress={handleGoogleLogin}
              disabled={oauthLoading}
            >
              <Text style={styles.oauthGoogleIcon}>G</Text>
              <Text style={styles.oauthBtnText}>Continuar com Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou com e-mail</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isSignUp ? 'Cadastrar e Conectar' : 'Entrar'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.toggleBtnText}>
              {isSignUp
                ? 'Já possui uma conta? Faça Login'
                : 'Novo por aqui? Crie uma conta gratuita'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'flex-end',
  },
  closeBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#0369A122',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38BDF844',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  oauthContainer: {
    gap: 10,
    marginBottom: 16,
  },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  oauthBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  oauthGoogleIcon: {
    color: '#EA4335',
    fontSize: 18,
    fontWeight: '900',
  },
  oauthGithubIcon: {
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1F2937',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    paddingVertical: 10,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  toggleBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
});
